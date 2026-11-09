const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.codex/skills/develop-web-game/node_modules/playwright'));
const keys=['inky','quillmaster','word_knight','rune_sorceress','alchemist','shadow_scribe'];
const base=path.join(process.cwd(),'assets/ui/errata/arena-v3');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
assert.deepEqual(Object.keys(manifest.heroes).sort(),keys.slice().sort(),'all six new character sets must be enabled');
for(const key of keys){
 for(const[action,count]of[['idle',4],['run',8],['attack',4]]){
  const hashes=[];for(let i=0;i<count;i++){const bytes=fs.readFileSync(path.join(base,`${key}_${action}_${i}.webp`));hashes.push(crypto.createHash('sha256').update(bytes).digest('hex'))}
  if(action==='run')assert.equal(new Set(hashes).size,8,`${key}: all eight running poses must be distinct`);
 }
}
(async()=>{
 const browser=await chromium.launch();const errors=[],badResponses=[];
 const output=path.join(process.cwd(),'output/errata-v3');fs.mkdirSync(output,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)badResponses.push(`${response.status()} ${response.url()}`)});
  await page.addInitScript(()=>localStorage.setItem('lexicon-survivors-archive-intro-seen-v1','1'));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');
  await page.click('#errata-begin');await page.click('#errata-character [data-title-step=preparation]');await page.click('#start-game-btn');
  await page.waitForFunction(()=>state.is_wave_active);
  await page.evaluate(async()=>{state.is_inventory_open=true;state.enemies=[];await ErrataMotion.ready;ErrataArena.room(1);document.getElementById('arena-notices').hidden=true});
  await page.waitForFunction(()=>{const image=ErrataArena.room(1);return image.complete&&image.naturalWidth});
  const reports=[];
  for(const key of keys){
   await page.evaluate(key=>{state.selected_char=key==='alchemist'?'lexicon_alchemist':key==='shadow_scribe'?'shadow_lexicographer':key;resetStats();state.is_inventory_open=true;state.player.x=0;state.player.y=0;state.enemies=[];state.projectiles=[];state.screen_shake=0;state.player.shot_recoil_timer=0;ErrataMotion.heroFrame(key,'idle',0)},key);
   await page.waitForFunction(key=>[['idle',4],['run',8],['attack',4]].every(([action,count])=>Array.from({length:count},(_,i)=>ErrataMotion.heroFrame(key,action,i)).every(Boolean)),key);
   const result=await page.evaluate(key=>{
    const player=state.player;const draws=[];const original=ctx.drawImage.bind(ctx);const originalNow=performance.now.bind(performance);
    const snapshot=()=>JSON.stringify({player:state.player,weapons:state.weapons,enemies:state.enemies,projectiles:state.projectiles,hp:state.hp,ink:state.ink_count});
    ctx.drawImage=(image,...args)=>{if(image.src?.includes(`/arena-v3/${key}_`))draws.push({file:image.src.split('/').at(-1),width:args.at(-2),height:args.at(-1)});original(image,...args)};
    try{
     player.vx=0;player.vy=0;player.is_dashing=false;player.attack_anim_timer=0;player.facing_left=false;
     for(let i=0;i<4;i++){performance.now=()=>i*240+1;render(0)}
     performance.now=originalNow;player.vx=180;player.vy=0;
     for(let i=0;i<8;i++){player.run_phase=i;render(0)}
     player.vx=0;player.attack_anim_kind='melee';player.attack_anim_duration=.4;player.attack_anim_windup=.1;player.attack_anim_active=.2;
     for(const timer of[.4,.33,.2,.03]){player.attack_anim_timer=timer;render(0)}
     const before=snapshot();render(0);const pure=snapshot()===before;
     const sample=document.createElement('canvas');sample.width=sample.height=128;const context=sample.getContext('2d');const alpha=[];
     for(const[action,count]of[['idle',4],['run',8],['attack',4]])for(let i=0;i<count;i++){const image=ErrataMotion.heroFrame(key,action,i);context.clearRect(0,0,128,128);context.drawImage(image,0,0);const pixels=context.getImageData(0,0,128,128).data;alpha.push({width:image.naturalWidth,height:image.naturalHeight,corners:[pixels[3],pixels[127*4+3],pixels[127*128*4+3],pixels.at(-1)]})}
     return{draws,pure,alpha};
    }finally{ctx.drawImage=original;performance.now=originalNow}
   },key);
   assert.ok(result.pure,`${key}: rendering must not mutate combat or movement`);
   for(const[action,count]of[['idle',4],['run',8],['attack',4]])for(let i=0;i<count;i++)assert.ok(result.draws.some(draw=>draw.file===`${key}_${action}_${i}.webp`),`${key}: actual canvas did not use ${action} frame ${i}`);
   assert.ok(result.draws.every(draw=>draw.width===96&&draw.height===96),'new art uses the reviewed world footprint');
   assert.ok(result.alpha.every(frame=>frame.width===128&&frame.height===128&&frame.corners.every(value=>value===0)),'all runtime textures are128px true-alpha frames');
   await page.evaluate(()=>{state.player.attack_anim_timer=0;state.player.vx=180;state.player.run_phase=2;updateHUD();render(1/60)});
   await page.screenshot({path:path.join(output,`${key}-arena.png`)});reports.push({key,distinctRunFrames:8,canvasFramesVerified:16});
  }
  await page.evaluate(()=>{ErrataMotion.pickup('ink');ErrataMotion.pickup('health')});await page.waitForFunction(()=>ErrataMotion.pickup('ink')&&ErrataMotion.pickup('health'));
  const pickups=await page.evaluate(()=>{
   state.selected_char='inky';resetStats();state.is_inventory_open=true;state.player.x=0;state.player.y=0;state.player.vx=0;state.player.vy=0;state.weapons=[];state.enemies=[];state.ink_mult=1;state.ink_count=0;state.artifacts_owned=[];
   state.ink_drops=[{x:8,y:0,value:7,collected:false}];state.health_drops=[{x:-8,y:0,value:18,collected:false}];state.hp=state.max_hp-30;
   const files=[],original=ctx.drawImage.bind(ctx);ctx.drawImage=(image,...args)=>{if(image.src?.includes('/pickups/'))files.push(image.src.split('/').at(-1));original(image,...args)};try{render(0)}finally{ctx.drawImage=original}
   const hp=state.hp;updatePlayer(0);return{files,ink:state.ink_count,healing:state.hp-hp,inkRemaining:state.ink_drops.length,healthRemaining:state.health_drops.length};
  });
  assert.ok(pickups.files.includes('ink.webp')&&pickups.files.includes('health.webp'),'canvas uses both new pickup illustrations');assert.equal(pickups.ink,7);assert.equal(pickups.healing,18);assert.equal(pickups.inkRemaining+pickups.healthRemaining,0);
  await page.evaluate(()=>document.documentElement.classList.add('errata-reduced-motion','errata-low-effects'));await page.waitForFunction(()=>ErrataArena.flags.reducedMotion&&ErrataArena.flags.lowEffects);
  assert.deepEqual(await page.evaluate(()=>{const pose=ErrataMotion.pose('inky',state.player,1/60);return[pose.scaleX,pose.scaleY]}),[1,1]);
  const damage=await page.evaluate(()=>{const input=[{text:'10',x:0,y:0,color:'#fff',lifetime:.7,max_lifetime:.7},{text:'10',x:1,y:1,color:'#fff',lifetime:.7,max_lifetime:.7},{text:'+18 HP',x:0,y:20,color:'#8fa',lifetime:.7,max_lifetime:.7}];const before=JSON.stringify(input),labels=[];const context={save(){},restore(){},strokeText(){},fillText(text){labels.push(text)}};ErrataMotion.drawCombatText(context,input,true);return{labels,pure:before===JSON.stringify(input)}});
  assert.deepEqual(damage.labels.sort(),['+18 HP','20']);assert.ok(damage.pure,'feedback aggregation must preserve actual hit records');
  assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);fs.writeFileSync(path.join(output,'proof.json'),JSON.stringify({heroes:reports,pickups,reducedMotion:true,errors},null,2));
  console.log('V3: all96 new character frames drawn by the actual renderer;48 distinct run poses;alpha, pickups, reduced motion, feedback totals and simulation isolation passed.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
