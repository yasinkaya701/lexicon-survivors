const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||path.join(require('node:os').homedir(),'.codex/skills/develop-web-game/node_modules/playwright'));
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();await page.goto(process.env.GAME_URL||'http://127.0.0.1:8000');
  await page.waitForFunction(()=>typeof spawnMilestoneBoss==='function');
  const cases=await page.evaluate(async()=>{
   await gameEconomyReady;const results=[];sounds.bossRoar=()=>{};speakBossVoiceLine=()=>{};state.player.x=state.player.y=0;
   for(const difficulty of Object.keys(DIFFICULTIES))for(let wave=5;wave<=100;wave+=5){
    state.difficulty=difficulty;state.current_wave=wave;state.enemies=[];state.enemy_projectiles=[];state.mistake_words=[];spawnMilestoneBoss(wave);
    const boss=state.active_boss,settings=DIFFICULTIES[difficulty];
    const beforeHp=(900+wave*80)*Math.pow(getWaveHpMult(wave),.45)*settings.enemy_hp_mult*1.7;
    const beforeDamage=(29+wave*1.25)*settings.enemy_damage_mult;
    fireBossProjectile(boss,.5,260,.55);
    results.push({difficulty,wave,hpRatio:boss.hp/beforeHp,maxHpRatio:boss.max_hp/beforeHp,damageRatio:boss.damage/beforeDamage,projectileRatio:state.enemy_projectiles[0]?.damage/(beforeDamage*.55),speed:boss.speed,expectedSpeed:(54+Math.min(28,wave*.16))*settings.enemy_speed_mult,interval:boss.boss_skill_interval,expectedInterval:Math.max(3.3,6.2-wave*.018),reward:boss.ink_reward,expectedReward:getBossWaveReward(wave)});
   }
   return results;
  });
  for(const c of cases){assert.ok(Math.abs(c.hpRatio-5)<1e-9,`${c.difficulty}/${c.wave}:5×HP`);assert.ok(Math.abs(c.maxHpRatio-5)<1e-9);assert.ok(Math.abs(c.damageRatio-3)<1e-9,`${c.difficulty}/${c.wave}:3×damage`);assert.ok(Math.abs(c.projectileRatio-3)<1e-9,'boss projectile inherits damage buff once');assert.equal(c.speed,c.expectedSpeed);assert.equal(c.interval,c.expectedInterval);assert.equal(c.reward,c.expectedReward)}
  console.log(`Boss balance: ${cases.length} wave/difficulty cases have5×HP and3×damage, including projectile damage; speed, attack interval and rewards unchanged.`);
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
