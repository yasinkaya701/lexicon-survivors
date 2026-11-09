const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.codex/skills/develop-web-game/node_modules/playwright'));
const output=path.join(process.cwd(),'output/errata-arena');fs.mkdirSync(output,{recursive:true});
(async()=>{const b=await chromium.launch();const errors=[];try{
 const p=await b.newPage({viewport:{width:1280,height:720}});
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
 await p.addInitScript(()=>localStorage.setItem('lexicon-survivors-archive-intro-seen-v1','1'));
 await p.goto(process.env.GAME_URL||'http://127.0.0.1:8000');await p.click('#errata-begin');await p.click('#errata-character [data-title-step=preparation]');await p.click('#start-game-btn');await p.waitForFunction(()=>JSON.parse(render_game_to_text()).mode==='wave');
 await p.evaluate(()=>{state.is_inventory_open=true;state.enemies=[];state.player.x=0;state.player.y=0;state.screen_shake=0;document.getElementById('chapter-transition-card').hidden=true});
 const contracts=await p.evaluate(()=>{
  const shots=['quill_blaster','syllable_shotgun','lexicon_beam','ink_flamethrower','crossword_crossbow','grammar_sniper','thesaurus_rocket','quote_pistols','rune_orb'].flatMap(id=>[0,Math.PI,-Math.PI/2,.8].map(angle=>({id,angle,...weaponVisualTestApi.fireTestShot(id,angle)})));
  return {shots,layout:{...ARENA_LAYOUT},timings:['dictionary_blade','calligraphy_katana'].map(id=>({id,...getMeleeTiming(id)}))};
 });
 for(const s of contracts.shots){if(s.projectileCount){assert.ok(Math.abs(Math.hypot(s.projectile.x-s.expected.x,s.projectile.y-s.expected.y)-(s.id==='quote_pistols'?12:0))<.001,`${s.id} muzzle mismatch`)}}
 assert.equal(contracts.layout.playerColliderRadius,15);assert.equal(contracts.layout.width,2800);assert.equal(contracts.layout.height,2100);
 // A full loadout must surround the body rather than share one hand.
 for(const count of [2,4,6]){
  const roots=await p.evaluate(count=>{state.equipped_weapons=['quill_blaster','syllable_shotgun','dictionary_blade','lexicon_beam','rune_orb','calligraphy_katana'].slice(0,count).map(id=>({id,tier:1}));state.active_weapon_index=0;syncWeapons();state.player.x=0;state.player.y=0;state.player.vx=0;state.player.vy=0;state.player.shot_recoil_timer=0;return state.weapons.map((w,i)=>{const r=getWeaponRootWorld(w,i);return{x:r.x,y:r.y}})},count);
  for(let i=0;i<roots.length;i++){assert.ok(Math.hypot(roots[i].x,roots[i].y)>=40,`${count} slots: weapon obscures body`);for(let j=0;j<i;j++)assert.ok(Math.hypot(roots[i].x-roots[j].x,roots[i].y-roots[j].y)>=34,`${count} slots: weapon mounts stack`)}
 }
 for(const wave of [1,26,51,76]){
  await p.evaluate(w=>{state.current_wave=w;ErrataArena.room(w)},wave);
  await p.waitForFunction(w=>{const img=ErrataArena.room(w);return img.complete&&img.naturalWidth>0},wave);
  for(const id of ['inky','quillmaster','word_knight','rune_sorceress','lexicon_alchemist','shadow_lexicographer']){
   await p.evaluate(({id,wave})=>{state.selected_char=id;state.current_wave=wave;state.player.x=0;state.player.y=0;state.player.vx=180;state.player.vy=0;state.player.run_phase=2;state.player.facing_left=false;state.equipped_weapons=[CHARACTERS[id].starting_weapon,'lexicon_beam','dictionary_blade','syllable_shotgun'].filter((v,i,a)=>a.indexOf(v)===i).map(id=>({id,tier:1}));state.active_weapon_index=0;syncWeapons();state.weapons.forEach(w=>{w.rotation=Math.PI;w.flash_timer=.03;w.recoil=.2});updateHUD();render(0)},{id,wave});
   await p.waitForFunction(()=>{const key={lexicon_alchemist:'alchemist',shadow_lexicographer:'shadow_scribe'}[state.selected_char]||state.selected_char;const layer=getHeroRenderLayers(state.player);const image=images[`ui/errata/heroes/${key}_${layer.base}_${layer.baseFrame}.webp`];return image?.complete&&image.naturalWidth>0});
   // Rendering a frame must not change combat, locomotion or resource state.
   const stable=await p.evaluate(()=>{const snapshot=()=>JSON.stringify({player:state.player,weapons:state.weapons,enemies:state.enemies,projectiles:state.projectiles,hp:state.hp,ink:state.ink_count});const before=snapshot();for(let n=0;n<8;n++)render(0);return before===snapshot()});assert.ok(stable,`${id} render mutates simulation`);
   if(wave===1||id==='inky')await p.screenshot({path:path.join(output,`${wave}-${id}.png`)});
  }
 }
 for(const [width,height]of[[1280,720],[1024,576],[844,390],[390,844]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(120);
  await p.evaluate(()=>{state.selected_char='inky';state.current_wave=1;state.equipped_weapons=['quill_blaster','syllable_shotgun','dictionary_blade','lexicon_beam','rune_orb','calligraphy_katana'].map(id=>({id,tier:1}));state.active_weapon_index=2;syncWeapons();updateHUD();showChapterCard(0);triggerTacticalAlert('KIRMIZI KALEM','Yakın dövüş ve menzilli silahları birlikte kullan.');render(0)});
  await p.waitForTimeout(80);
  const layout=await p.evaluate(()=>{const hudBottom=Math.max(...[...document.querySelectorAll('#hud,#hud .hud-row,#hud .info-subrow,#hud .char-info')].map(el=>el.getBoundingClientRect().bottom));const notices=[...document.querySelector('#arena-notices').children].filter(el=>getComputedStyle(el).display!=='none').map(el=>{const r=el.getBoundingClientRect();return{id:el.id,top:r.top,bottom:r.bottom,right:r.right,left:r.left}});return{hudBottom,notices,overflow:document.documentElement.scrollWidth>innerWidth+1,tokens:[...document.querySelectorAll('.weapon-token')].map(el=>{const r=el.getBoundingClientRect();return{w:r.width,h:r.height}})}});
  assert.ok(!layout.overflow,`${width}: horizontal overflow`);for(const n of layout.notices)assert.ok(n.top>=layout.hudBottom+3,`${width}: ${n.id} covers loadout HUD`);for(const token of layout.tokens)assert.ok(token.w>=43&&token.h>=43,`${width}: weapon target too small`);
  await p.evaluate(()=>render(0));await p.screenshot({path:path.join(output,`${width}-${height}-six-weapons.png`)});
 }
 await p.evaluate(()=>{document.documentElement.classList.add('errata-reduced-motion','errata-low-effects')});await p.waitForTimeout(50);assert.deepEqual(await p.evaluate(()=>({...ErrataArena.flags})),{reducedMotion:true,lowEffects:true});
 assert.deepEqual(errors,[]);console.log('Arena: 6 heroes × 4 biomes, multiweapon HUD, pure rendering, muzzle contracts and effect preferences passed.');
 fs.writeFileSync(path.join(output,'combat-contracts.json'),JSON.stringify(contracts,null,2));
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
