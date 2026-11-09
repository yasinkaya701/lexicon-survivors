const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.codex/skills/develop-web-game/node_modules/playwright'));
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('lexicon-survivors-archive-intro-seen-v1','1'));
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');await page.click('#errata-begin');await page.click('#errata-character [data-title-step=preparation]');await page.click('#start-game-btn');
 await page.waitForFunction(()=>state.is_wave_active);assert.equal(await page.locator('#touch-weapon-btn').count(),0,'redundant weapon-cycle action removed');assert.match(await page.locator('#touch-inv-btn').textContent(),/Envanter/);await page.evaluate(()=>{state.enemies=[];state.equipped_weapons=['quill_blaster','syllable_shotgun','dictionary_blade','lexicon_beam','rune_orb','calligraphy_katana'].map(id=>({id,tier:1}));syncWeapons();updateHUD()});
 fs.mkdirSync('output/combat-controls',{recursive:true});
 for(const[width,height]of[[1280,720],[1024,576],[844,390],[640,360],[390,844]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>{syncMobileControlsVisibility();updateHUD()});await page.waitForTimeout(80);
  const layout=await page.evaluate(()=>{
   const rect=el=>{const r=el.getBoundingClientRect();return{id:el.id,x:r.left,y:r.top,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
   const dock=document.getElementById('combat-action-dock');
   return{notices:[...document.querySelector('#arena-notices').children].filter(el=>getComputedStyle(el).display!=='none'&&!el.hidden).map(rect),dock:!!dock&&!dock.hidden,buttons:[...document.querySelectorAll('#touch-action-buttons button')].map(rect),slots:[...document.querySelectorAll('.weapon-token')].map(rect),weapons:rect(document.getElementById('weapons-info')),joystick:getComputedStyle(document.getElementById('mobile-touch-controls')).display==='none'?null:rect(document.getElementById('joystick-zone')),overflow:document.documentElement.scrollWidth>innerWidth+1};
  });
  assert.ok(layout.dock,`${width}: battle action dock visible`);assert.ok(!layout.overflow);
  for(const slot of layout.slots)assert.ok(slot.w>=48&&slot.h>=48,`${width}: equipment touch target is at least48px`);
  const boxes=[...layout.buttons,...layout.notices,layout.weapons,...(layout.joystick?[layout.joystick]:[])];
  for(const box of boxes){assert.ok(box.x>=0&&box.y>=0&&box.right<=width+1&&box.bottom<=height+1,`${width}: ${box.id} inside viewport`);if(box.id.startsWith('touch-'))assert.ok(box.w>=48&&box.h>=48,`${box.id}: touch target`)}
  const gadget=layout.buttons.find(b=>b.id==='touch-gadget-btn');assert.ok(gadget.w>=96&&gadget.h>=(height<=500?76:96),'gadget has primary visual weight');
  for(let i=0;i<boxes.length;i++)for(let j=0;j<i;j++){const a=boxes[i],b=boxes[j];assert.ok(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),`${width}: ${a.id} overlaps ${b.id}`)}
  await page.screenshot({path:`output/combat-controls/${width}-${height}.png`});
 }
 const progress=await page.evaluate(()=>{ErrataCombat.update({gadget:{name:'Deneme',cooldown:10},remaining:5,duration:5});return document.getElementById('touch-gadget-btn').style.getPropertyValue('--gadget-ready')});assert.equal(Number(progress),0,'cooldown meter uses the effective relic-modified duration');
 await page.locator('#touch-inv-btn').click();assert.equal(await page.evaluate(()=>state.is_inventory_open),true);assert.equal(await page.locator('#combat-action-dock').isVisible(),false);await page.click('#close-inventory-btn');assert.equal(await page.locator('#combat-action-dock').isVisible(),true);
 await page.click('[data-open-pause]');assert.equal(await page.locator('#combat-action-dock').isVisible(),false);await page.click('[data-pause-action=resume]');assert.equal(await page.locator('#combat-action-dock').isVisible(),true);
 assert.deepEqual(errors,[]);console.log('Combat controls:5viewport sizes,6weapon slots,primary gadget targets,joystick separation and modal gates passed.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
