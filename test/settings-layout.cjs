const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.codex/skills/develop-web-game/node_modules/playwright'));
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage();await page.addInitScript(()=>localStorage.setItem('lexicon-survivors-archive-intro-seen-v1','1'));await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');await page.click('[data-open-book=settings]');fs.mkdirSync('output/settings-layout',{recursive:true});
 for(const[width,height]of[[844,390],[1024,576],[390,844],[640,360]])for(const large of[false,true]){
  await page.setViewportSize({width,height});await page.locator('[data-setting=large-text]').setChecked(large);await page.evaluate(()=>document.fonts.ready);
  const result=await page.evaluate(()=>{const area=document.querySelector('#errata-book .errata-dialog-content'),bounds=area.getBoundingClientRect(),bad=[];for(const row of area.querySelectorAll('.settings-row')){const r=row.getBoundingClientRect();if(r.left<bounds.left-1||r.right>bounds.right+1)bad.push('row outside panel');for(const node of row.querySelectorAll('small,input,select,button')){const range=document.createRange();range.selectNodeContents(node);const rects=node.tagName==='SMALL'?[...range.getClientRects()]:[node.getBoundingClientRect()];if(rects.some(p=>p.left<bounds.left-1||p.right>bounds.right+1))bad.push(node.textContent||node.type)}}return{bad,overflow:area.scrollWidth>area.clientWidth+1}});
  assert.deepEqual(result.bad,[],`${width},large=${large}: settings copy and controls fit`);assert.ok(!result.overflow);await page.screenshot({path:`output/settings-layout/${width}-${height}-${large?'large':'normal'}.png`});
 }
 console.log('Settings: text and audio controls fit4sizes with normal/large text; no horizontal clipping.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
