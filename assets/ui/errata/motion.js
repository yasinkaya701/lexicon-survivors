/* Visual motion/texture caches. No combat or collection objects are modified. */
(() => {
  let manifest={heroes:{},enemies:{},pickups:{}};
  const textures=new Map(),requestedHeroes=new Set(),requestedEnemies=new Set(),poses=new Map(),glows=new Map();
  let repaintQueued=false;
  function repaint(){if(repaintQueued)return;repaintQueued=true;requestAnimationFrame(()=>{repaintQueued=false;if(typeof window.render==='function')window.render(0)})}
  function texture(path){if(!path)return null;if(!textures.has(path)){const image=new Image();image.decoding='async';image.onload=repaint;image.src=`assets/ui/errata/arena-v3/${path}`;textures.set(path,image)}const image=textures.get(path);return image.complete&&image.naturalWidth?image:null}
  const ready=fetch('assets/ui/errata/arena-v3/manifest.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Arena manifest');return response.json()}).then(data=>{manifest=data;repaint();return data}).catch(()=>manifest);
  function heroFrame(key,action,frame,player){const painted=window.GrimoireSprites?.heroFrame(key,action,frame,player);if(painted)return painted;return legacyHeroFrame(key,action,frame)}
  function legacyHeroFrame(key,action,frame){const hero=manifest.heroes?.[key];if(!hero)return null;const prefix=hero.prefix||key;if(!requestedHeroes.has(key)){requestedHeroes.add(key);for(const [kind,count]of[['idle',4],['run',8],['attack',4]])for(let i=0;i<count;i++)texture(`${prefix}_${kind}_${i}.webp`)}const kind=action==='ranged'?'attack':action;return texture(`${prefix}_${kind}_${frame}.webp`)}
  const enemyAliases={boss_red_inquisitor:'red_pen_boss',boss_lexicon_dragon:'lexicon_dragon_boss',boss_void_curator:'vocabulary_void',boss_syntax_titan:'syntax_titan'};
  function enemyFrame(sprite,time=performance.now(),phase=0,enemy=null){
    const painted=enemy&&window.GrimoireSprites?.enemyFrame(sprite,time,phase,enemy);
    if(painted)return painted;
    return legacyEnemyFrame(sprite,time,phase);
  }
  function legacyEnemyFrame(sprite,time=performance.now(),phase=0){
    const file=String(sprite||'').split('/').at(-1).replace(/^monster_/,'');
    const key=enemyAliases[file.replace(/\.[^.]+$/,'')]||file.replace(/\.[^.]+$/,'');
    const entry=manifest.enemies?.[file]||manifest.enemies?.[`${key}.png`]||manifest.enemies?.[key];
    if(!entry)return null;
    if(typeof entry==='string')return texture(entry);
    const frames=Array.isArray(entry.frames)?entry.frames:[];
    if(!frames.length)return null;
    if(!requestedEnemies.has(key)){requestedEnemies.add(key);frames.forEach(path=>texture(path))}
    const reduced=window.ErrataArena?.flags?.reducedMotion;
    const fps=Number.isFinite(entry.fps)&&entry.fps>0?entry.fps:8;
    const index=reduced?0:Math.floor((time*fps/1000)+(Number(phase)||0))%frames.length;
    return texture(frames[(index+frames.length)%frames.length]);
  }
  function pickup(kind){return texture(manifest.pickups?.[kind])}
  function pose(key,player,dt){const reduced=window.ErrataArena?.flags?.reducedMotion;const speed=Math.hypot(player.vx,player.vy);const moving=speed>30;const phase=(player.run_phase||0)*Math.PI/4;const target=(moving?player.vy/Math.max(speed,1):0)*.075+(moving&&!reduced?Math.sin(phase)*.018:0);let result=poses.get(key);if(!result){result={rotation:target,clock:0,scaleX:1,scaleY:1};poses.set(key,result)}const elapsed=Math.min(.05,Math.max(0,dt||0));result.clock+=elapsed;result.rotation+=(target-result.rotation)*(1-Math.exp(-elapsed*20));const stretch=reduced?0:moving?Math.sin(phase*2)*.014:Math.sin(result.clock*2.1)*.006;result.scaleY=1+stretch;result.scaleX=1-stretch*.5;return result}
  function glow(kind){if(glows.has(kind))return glows.get(kind);const surface=document.createElement('canvas');surface.width=surface.height=64;const context=surface.getContext('2d');const gradient=context.createRadialGradient(32,32,2,32,32,31);const color=kind==='ink'?'72,182,171':'181,100,92';gradient.addColorStop(0,`rgba(${color},.3)`);gradient.addColorStop(.45,`rgba(${color},.13)`);gradient.addColorStop(1,`rgba(${color},0)`);context.fillStyle=gradient;context.fillRect(0,0,64,64);glows.set(kind,surface);return surface}
  function drawPickup(context,kind,drop,time,lowEffects){const image=window.GrimoireSprites?.pickupFrame(kind,time,drop.x*.01+drop.y*.013)||pickup(kind);if(!image)return false;const reduced=window.ErrataArena?.flags?.reducedMotion;const phase=(drop.x*.013+drop.y*.019)+(reduced?0:time*.0025);const bob=reduced?0:Math.sin(phase)*2;const size=kind==='ink'?28:35;context.save();if(!lowEffects){context.globalAlpha=.7;context.drawImage(glow(kind),drop.x-size*.8,drop.y-size*.55,size*1.6,size*1.1)}context.globalAlpha=.3;context.fillStyle='#110e13';context.beginPath();context.ellipse(drop.x,drop.y+8,size*.25,3,0,0,Math.PI*2);context.fill();context.globalAlpha=1;context.translate(drop.x,drop.y+bob);if(!reduced)context.rotate(Math.sin(phase*.7)*.075);context.imageSmoothingEnabled=true;context.drawImage(image,-size/2,-size/2,size,size);context.restore();return true}
  function drawProjectileTrail(context,projectile,lowEffects){
    if(lowEffects||(projectile.spd||0)<180||['beam','beam_split','flame'].includes(projectile.type))return;
    const length=Math.min(25,Math.max(10,(projectile.spd||300)/28));
    context.save();context.globalAlpha=.2;context.fillStyle=projectile.crit?'#e5c17a':(projectile.color||'#b8d9d1');
    context.beginPath();context.moveTo(-length,0);context.quadraticCurveTo(-8,-2,-3,-1.2);context.lineTo(-3,1.2);context.quadraticCurveTo(-8,2,-length,0);context.fill();context.restore();
  }
  // Combat text speaks the catalog language: damage is set in the
  // dictionary face, a critical hit is circled in proofreading red, and
  // every colour folds into the night palette.
  const CRIT_COLOR='#ffd700',PROOF='#FF6A5C',NIGHT_TEXT='#E6EAF1',RULE_BLUE='#A9C7E8';
  const HEAL=new Set(['#8ee0b5','#4ade80','#a9c6b6','#587767']);
  const HURT=new Set(['#ef4444','#c5221f','#f97316']);
  function inkFor(color){const c=String(color||'').toLowerCase();if(c===CRIT_COLOR)return PROOF;if(HURT.has(c))return PROOF;if(HEAL.has(c))return RULE_BLUE;return NIGHT_TEXT}
  function ring(context,x,y,w,h){context.beginPath();const rx=w/2+9,ry=h/2+6;for(let i=0;i<=34;i++){const t=-.9+i/34*(Math.PI*2+.55);const wobble=1+Math.sin(i*1.7)*.035;const px=x+Math.cos(t)*rx*wobble,py=y+Math.sin(t)*ry*wobble;i?context.lineTo(px,py):context.moveTo(px,py)}context.stroke()}
  function drawCombatText(context,texts,lowEffects){
    const batches=new Map(),labels=[];
    for(const text of texts){
      if(!/^\d+(?:\.\d+)?$/.test(String(text.text))){labels.push(text);continue}
      const age=text.max_lifetime-text.lifetime;
      const key=`${Math.round(text.x/42)}:${Math.round(text.y/42)}:${text.color}:${Math.floor(age/.15)}`;
      const previous=batches.get(key);
      if(previous){previous.total+=Number(text.text);previous.count++;previous.x+=(text.x-previous.x)/previous.count;previous.y=Math.min(previous.y,text.y);previous.lifetime=Math.max(previous.lifetime,text.lifetime)}
      else batches.set(key,{...text,total:Number(text.text),count:1,numeric:true});
    }
    for(const value of batches.values())labels.push({...value,text:Number(value.total.toFixed(1)).toString(),size:Math.min(21,Math.max(value.size||13,14)+(value.count>1?2:0))});
    context.save();context.textAlign='center';context.textBaseline='alphabetic';context.lineJoin='round';
    for(const text of labels){
      const progress=Math.max(0,text.lifetime/text.max_lifetime);
      const size=Math.max(13,text.size||13);
      const crit=String(text.color).toLowerCase()===CRIT_COLOR;
      context.globalAlpha=Math.min(1,progress*1.8);
      context.font=text.numeric?`italic 700 ${size+2}px "Grenze", Georgia, serif`:`500 ${Math.max(11,size-2)}px "IBM Plex Mono", monospace`;
      context.strokeStyle='rgba(10,14,24,.92)';context.lineWidth=3.5;
      context.fillStyle=inkFor(text.color);
      context.strokeText(text.text,text.x,text.y);context.fillText(text.text,text.x,text.y);
      if(crit&&!lowEffects){const w=context.measureText(text.text).width;context.strokeStyle=PROOF;context.lineWidth=1.8;ring(context,text.x,text.y-size*.36,w,size*.9)}
    }
    context.restore();
  }
  window.ErrataMotion=Object.freeze({ready,heroFrame,enemyFrame,pickup,pose,drawPickup,drawProjectileTrail,drawCombatText});
})();
