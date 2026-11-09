const assert=require('node:assert/strict');const path=require('node:path');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.codex/skills/develop-web-game/node_modules/playwright'));
(async()=>{const b=await chromium.launch();try{const p=await b.newPage({viewport:{width:1280,height:720}});await p.goto(process.env.GAME_URL||'http://127.0.0.1:8000');await p.waitForFunction(()=>typeof render_game_to_text==='function');
 const expected=await p.evaluate(async()=>{await storyArcReady;state.selected_char='inky';state.is_wave_active=false;state.auto_new_tur=false;await showStoryIntermission(5);return STORY_ARC_DATA.characters.inky.episodes[0].beats[0][1]});
 assert.equal(await p.locator('#story-copy').textContent(),expected,'illustration must use its canonical character beat, not replace it with an unrelated boss line');
 assert.equal(await p.locator('#story-back').isDisabled(),true);await p.click('#story-next');assert.equal(await p.locator('#story-counter').textContent(),'2 / 5');await p.click('#story-back');assert.equal(await p.locator('#story-counter').textContent(),'1 / 5');assert.equal(await p.locator('#story-copy').textContent(),expected);
 console.log('Story: canonical dialogue matches the scene; previous/next preserve panel state.');
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
