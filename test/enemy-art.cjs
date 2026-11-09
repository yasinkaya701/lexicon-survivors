const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.codex/skills/develop-web-game/node_modules/playwright'));
const keys=['grammar_goblin','typo_slime','punctuation_phantom','idiom_imp','homophone_harpy','tautology_twin','dangling_modifier','run_on_reaper','syntax_titan','malapropism_mimic','palindrome_phantom','oxymoron_ogre','vocabulary_void','double_negative_drake','spelling_spectre','typo_splinter','red_pen_boss','lexicon_dragon_boss'];
const longSequences=new Set(['vocabulary_void','double_negative_drake','spelling_spectre','typo_splinter']);
const countFor=key=>longSequences.has(key)?16:4;
const manifest=JSON.parse(fs.readFileSync('assets/ui/errata/arena-v3/manifest.json','utf8'));
for(const key of keys){
 const entry=manifest.enemies[`${key}.png`];assert.equal(entry?.frames?.length,countFor(key),`${key}: complete new animation sequence enabled`);
 const hashes=entry.frames.map(file=>crypto.createHash('sha256').update(fs.readFileSync(path.resolve('assets/ui/errata/arena-v3',file))).digest('hex'));
 assert.equal(new Set(hashes).size,countFor(key),`${key}: distinct painted poses`);
}
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`)});
  await page.addInitScript(()=>localStorage.setItem('lexicon-survivors-archive-intro-seen-v1','1'));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');await page.click('#errata-begin');await page.click('#errata-character [data-title-step=preparation]');await page.click('#start-game-btn');
  await page.evaluate(async keys=>{state.is_inventory_open=true;state.enemies=[];state.player.x=state.player.y=0;state.screen_shake=0;await ErrataMotion.ready;keys.forEach(key=>ErrataMotion.enemyFrame(`${key}.png`,0))},keys);
  await page.waitForFunction(keys=>keys.every(key=>Array.from({length:16},(_,i)=>i*125).every(time=>ErrataMotion.enemyFrame(`${key}.png`,time))),keys);
  const proof=await page.evaluate(keys=>{
   const sample=document.createElement('canvas');sample.width=sample.height=128;const context=sample.getContext('2d');const frames=[];
   for(const key of keys)for(const time of Array.from({length:['vocabulary_void','double_negative_drake','spelling_spectre','typo_splinter'].includes(key)?16:4},(_,i)=>i*125)){const image=ErrataMotion.enemyFrame(`${key}.png`,time);const size=image.naturalWidth;sample.width=sample.height=size;context.drawImage(image,0,0);const pixels=context.getImageData(0,0,size,size).data;frames.push({key,file:image.src.split('/').at(-1),size:[image.naturalWidth,image.naturalHeight],alpha:[pixels[3],pixels[(size-1)*4+3],pixels[(size-1)*size*4+3],pixels.at(-1)]})}
   const aliases=['upgrade_v2/boss_red_inquisitor.png','upgrade_v2/boss_lexicon_dragon.png','upgrade_v2/boss_void_curator.png','upgrade_v2/boss_syntax_titan.png'].map(key=>ErrataMotion.enemyFrame(key,0)?.src.split('/').at(-1));
   state.enemies=keys.map((key,i)=>({x:(i%6-2.5)*130,y:(Math.floor(i/6)-1)*150,type:key,sprite:`${key}.png`,size:i>=16?68:48,hp:100,max_hp:100,facing_left:false}));
   const before=JSON.stringify(state.enemies),draws=[],original=ctx.drawImage.bind(ctx),originalNow=performance.now.bind(performance);
   ctx.drawImage=(image,...args)=>{if(image.src?.includes('/arena-v4/enemies/'))draws.push(image.src.split('/').at(-1));original(image,...args)};
   try{for(const time of Array.from({length:16},(_,i)=>i*125)){performance.now=()=>time;render(0)}}finally{ctx.drawImage=original;performance.now=originalNow}
   return{frames,aliases,draws,pure:before===JSON.stringify(state.enemies)};
  },keys);
  assert.equal(proof.frames.length,120);assert.ok(proof.frames.every(frame=>frame.size.every(n=>n===(frame.key.endsWith('_boss')?256:128))&&frame.alpha.every(n=>n===0)),'all120 textures must have production dimensions and true alpha');
  for(const key of keys){assert.equal(new Set(proof.frames.filter(frame=>frame.key===key).map(frame=>frame.file)).size,countFor(key));for(let i=0;i<countFor(key);i++)assert.ok(proof.draws.includes(`${key}_${i}.webp`),`${key}: actual canvas uses frame${i}`)}
  assert.deepEqual(proof.aliases,['red_pen_boss_0.webp','lexicon_dragon_boss_0.webp','vocabulary_void_0.webp','syntax_titan_0.webp']);assert.ok(proof.pure,'drawing leaves enemy simulation unchanged');
  await page.evaluate(()=>document.documentElement.classList.add('errata-reduced-motion'));await page.waitForFunction(()=>ErrataArena.flags.reducedMotion);
  assert.equal(await page.evaluate(()=>ErrataMotion.enemyFrame('grammar_goblin.png',875).src.split('/').at(-1)),'grammar_goblin_0.webp');
  fs.mkdirSync('output/errata-enemies',{recursive:true});await page.screenshot({path:'output/errata-enemies/all-species.png'});fs.writeFileSync('output/errata-enemies/proof.json',JSON.stringify(proof,null,2));
  assert.deepEqual(errors,[]);console.log('Enemies: all18 identities use120 distinct new painted frames; real canvas, boss aliases, alpha, reduced motion and simulation isolation passed.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
