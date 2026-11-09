const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || require('node:path').join(require('node:os').homedir(), '.codex/skills/develop-web-game/node_modules/playwright'));
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();
    await page.goto(process.env.GAME_URL || 'http://127.0.0.1:8000');
    await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
    const result=await page.evaluate(()=>{
      updateHUD();
      const observer=new MutationObserver(()=>{});
      observer.observe(document.getElementById('hud'),{attributes:true,childList:true,characterData:true,subtree:true});
      for(let i=0;i<120;i++)updateHUD();
      const unchangedMutations=observer.takeRecords().length;
      state.hp=73;state.max_hp=125;state.ink_count=123;state.current_wave=26;updateHUD();
      const changedMutations=observer.takeRecords().length;observer.disconnect();
      return {unchangedMutations,changedMutations,hp:document.getElementById('hp-text').textContent,ink:document.getElementById('ink-value').textContent,wave:document.getElementById('archive-progress-track').getAttribute('aria-valuenow')};
    });
    assert.equal(result.unchangedMutations,0,'unchanged HUD must not mutate DOM');
    assert.ok(result.changedMutations>0,'real state changes must still render');
    assert.equal(result.hp,'73 / 125 HP');assert.equal(result.ink,'123');assert.equal(result.wave,'26');
    console.log('HUD: 120 unchanged updates create 0 mutations; health, ink and wave changes render.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
