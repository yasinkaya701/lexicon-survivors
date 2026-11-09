const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.join(os.homedir(), '.codex/skills/develop-web-game/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:720}});
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
    await page.waitForFunction(()=>typeof window.render_game_to_text==='function' && window.ErrataMotion?.ready);
    const ids=['inky','quillmaster','word_knight','rune_sorceress','lexicon_alchemist','shadow_lexicographer'];
    const results=await page.evaluate(async ids=>{
      await ErrataMotion.ready;
      const canvas=document.getElementById('game-canvas');
      const context=canvas.getContext('2d');
      const originalDrawImage=context.drawImage;
      const calls=[];
      context.drawImage=function(image,...args){calls.push({src:image?.src||'',args});return originalDrawImage.call(this,image,...args)};
      const rows=[];
      try {
        for(const id of ids){
          state.selected_char=id; state.is_inventory_open=true; state.is_wave_active=false;
          state.enemies=[]; state.projectiles=[]; state.gadget_decoys=[{x:state.player.x+120,y:state.player.y,timer:0.8,hp:17}];
          state.player.x=0; state.player.y=0; state.player.vx=0; state.player.vy=0;
          updateHUD();
          const portrait=document.getElementById('hero-hud-portrait');
          const expectedPortrait=id==='shadow_lexicographer'?'assets/ui/errata/portraits/shadow_lexicographer-selection-v3.webp':`assets/ui/errata/portraits/${id}-selection.webp`;
          const key={lexicon_alchemist:'alchemist',shadow_lexicographer:'shadow_scribe'}[id]||id;
          const layer=getHeroRenderLayers(state.player);
          let hero=ErrataMotion.heroFrame(key,layer.base,layer.baseFrame);
          if(!hero)await new Promise(resolve=>{const poll=()=>{hero=ErrataMotion.heroFrame(key,layer.base,layer.baseFrame);if(hero)resolve();else setTimeout(poll,16)};poll()});
          let decoyHero=ErrataMotion.heroFrame(key,'idle',0);
          if(!decoyHero)await new Promise(resolve=>{const poll=()=>{decoyHero=ErrataMotion.heroFrame(key,'idle',0);if(decoyHero)resolve();else setTimeout(poll,16)};poll()});
          const decoysBefore=JSON.stringify(state.gadget_decoys);
          const combatBefore=JSON.stringify({player:state.player,decoys:state.gadget_decoys,projectiles:state.projectiles,enemies:state.enemies});
          calls.length=0; render(0);
          const currentDecoyDraw=calls.some(call=>call.src===decoyHero?.src && call.args.length===4 && call.args[2]===48 && call.args[3]===56);
          const liveHeroDraw=calls.some(call=>call.src.includes(`/arena-v3/${key}_`) && call.args.length===4 && call.args[2]===96 && call.args[3]===96);
          const after=JSON.stringify({player:state.player,decoys:state.gadget_decoys,projectiles:state.projectiles,enemies:state.enemies});
          rows.push({id,portrait:portrait.getAttribute('src'),alt:portrait.alt,expectedPortrait,currentDecoyDraw,liveHeroDraw,pure:after===combatBefore,decoysBefore});
        }
      } finally {context.drawImage=originalDrawImage}
      return rows;
    },ids);
    for(const row of results){
      assert.equal(row.portrait,row.expectedPortrait,`${row.id}: HUD should use its canonical selection portrait`);
      assert.equal(row.alt,`${await page.evaluate(id=>CHARACTERS[id].name,row.id)} portresi`,`${row.id}: accessible name retained`);
      assert.ok(row.currentDecoyDraw,`${row.id}: actual canvas drawImage should use current painted hero at decoy footprint`);
      assert.ok(row.liveHeroDraw,`${row.id}: actual canvas drawImage should render painted hero`);
      assert.ok(row.pure,`${row.id}: render must not mutate player, decoy, projectile or enemy data`);
    }
    console.log(`Hero art: HUD portraits and live/decoy canvas sources match for ${results.length} identities; render state stayed unchanged.`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
