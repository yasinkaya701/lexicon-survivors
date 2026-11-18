/* Rendering-only arena presentation. No simulation objects are modified. */
(() => {
  const root = document.documentElement;
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const flags = { reducedMotion:false, lowEffects:false };
  function syncFlags() {
    flags.reducedMotion = motionQuery.matches || root.classList.contains('errata-reduced-motion');
    flags.lowEffects = root.classList.contains('errata-low-effects');
  }
  syncFlags();
  motionQuery.addEventListener('change', syncFlags);
  new MutationObserver(syncFlags).observe(root, {attributes:true,attributeFilter:['class']});
  const rooms = ['library','catacombs','observatory','final-page'];
  // Painted floor edges, measured in the 1600×1200 source illustrations.
  // Fit these edges to the existing arena boundary instead of moving collision.
  const floors = [[65,120,1535,1090],[93,172,1505,1015],[82,110,1515,1090],[85,105,1515,1090]];
  const artwork = new Map();
  const structureArt = new Map();
  const structures = {
    ink_well:{file:'ink-well',crop:[140,91,228,294],height:136},
    resonance_bell:{file:'resonance-bell',crop:[152,118,215,230],height:119},
    astral_astrolabe:{file:'astral-astrolabe',crop:[144,118,225,239],height:124},
    brazier:{painted:true,height:120},illuminated_lectern:{painted:true,height:126},memory_clue:{painted:true,height:96}
  };
  const biomeIndex = wave => Math.min(3, Math.max(0, Math.floor((wave - 1) / 25)));
  function room(wave) {
    const key = rooms[biomeIndex(wave)];
    if (!artwork.has(key)) {
      const image = new Image(); image.decoding='async';
      image.onload=()=>{if(typeof window.render==='function')requestAnimationFrame(()=>window.render(0))};
      image.onerror=()=>{if(typeof window.render==='function')requestAnimationFrame(()=>window.render(0))};
      image.src=`assets/ui/errata/world/${key}.webp`;
      artwork.set(key,image);
    }
    return artwork.get(key);
  }
  // ---- Painted Grimoire arena: tiled floor under a nine-sliced border whose
  // open centre (atlas `inner`) is fitted to the playable boundary.
  const BIOMES = ['reading_hall','word_corridor','observatory','last_page'];
  const TILE = 512; // world px per floor tile
  // Fixed floor-decal spots (world px), kept clear of the centre spawn.
  const DECALS = [[-760,-420,.55],[820,360,.5],[-520,520,.45],[640,-560,.5],[40,700,.4]];
  function hash(x,y){let h=(x*374761393+y*668265263)|0;h=(h^(h>>>13))*1274126177|0;return (h^(h>>>16))>>>0}
  function drawPaintedRoom(context,wave,width,height,layout) {
    const G=window.GrimoireSprites;if(!G)return false;
    const biome=BIOMES[biomeIndex(wave)];
    const frame=G.image(`arena_${biome}_frame`);
    const floors=['a','b','c'].map(v=>G.image(`arena_${biome}_floor_${v}`));
    const inner=(window.GRIMOIRE_ATLAS?.assets||{})[`arena_${biome}_frame`]?.inner;
    if(!frame||floors.some(f=>!f)||!inner)return false;
    const ix=layout?.innerShelfX ?? width*1245/2800, iy=layout?.innerShelfY ?? height*870/2100;
    context.save();context.imageSmoothingEnabled=true;
    // Floor: tiles over the whole arena (the border hides the outer ring).
    const nx=Math.ceil(width/TILE/2)+1, ny=Math.ceil(height/TILE/2)+1;
    for(let ty=-ny;ty<ny;ty++)for(let tx=-nx;tx<nx;tx++){
      // One seamless variant: the b/c variants carry a different tone and show as a grid.
      context.drawImage(floors[0],tx*TILE,ty*TILE,TILE+1,TILE+1);
    }
    const decal=G.image(`arena_${biome}_floor_decal`);
    if(decal)for(const [x,y,a] of DECALS){context.globalAlpha=a;context.drawImage(decal,x-110,y-110,220,220)}
    context.globalAlpha=1;
    // Border: nine-slice so the opening lands exactly on the playable edge.
    const sx=[0,inner[0],inner[2],frame.naturalWidth], sy=[0,inner[1],inner[3],frame.naturalHeight];
    const dx=[-width/2,-ix,ix,width/2], dy=[-height/2,-iy,iy,height/2];
    for(let y=0;y<3;y++)for(let x=0;x<3;x++){
      if(x===1&&y===1)continue;
      context.drawImage(frame,sx[x],sy[y],sx[x+1]-sx[x],sy[y+1]-sy[y],dx[x],dy[y],dx[x+1]-dx[x],dy[y+1]-dy[y]);
    }
    // The opening's feathered rim also sits in the centre slice.
    context.drawImage(frame,sx[1],sy[1],sx[2]-sx[1],sy[2]-sy[1],dx[1],dy[1],dx[2]-dx[1],dy[2]-dy[1]);
    context.restore();
    return true;
  }
  function drawRoom(context,wave,width,height,layout) {
    if (drawPaintedRoom(context,wave,width,height,layout)) return true;
    const image = room(wave);
    if (!image.complete || !image.naturalWidth) return false;
    const floor = floors[biomeIndex(wave)];
    const sourceX = [0,floor[0],floor[2],image.naturalWidth];
    const sourceY = [0,floor[1],floor[3],image.naturalHeight];
    const innerX = layout?.innerShelfX ?? width * 1245/2800;
    const innerY = layout?.innerShelfY ?? height * 870/2100;
    const targetX = [-width/2,-innerX,innerX,width/2];
    const targetY = [-height/2,-innerY,innerY,height/2];
    context.save();context.imageSmoothingEnabled=true;
    for(let y=0;y<3;y++)for(let x=0;x<3;x++) {
      context.drawImage(image,sourceX[x],sourceY[y],sourceX[x+1]-sourceX[x],sourceY[y+1]-sourceY[y],targetX[x],targetY[y],targetX[x+1]-targetX[x],targetY[y+1]-targetY[y]);
    }
    context.restore();
    return true;
  }
  function drawShadow(context,x,y,size,hero=false) {
    context.save();
    context.fillStyle = hero ? 'rgba(10,8,15,.55)' : 'rgba(10,8,15,.42)';
    context.beginPath();
    context.ellipse(x,y+size*.58,size*.30,size*.09,0,0,Math.PI*2);
    context.fill();
    if (hero) {
      context.strokeStyle='rgba(228,220,194,.3)';context.lineWidth=1.4;
      context.beginPath();context.ellipse(x,y+size*.58,size*.32,size*.105,0,0,Math.PI*2);context.stroke();
    }
    context.restore();
  }
  function structure(id) {
    const data=structures[id];if(!data)return null;
    if(data.painted)return null;
    if(!structureArt.has(id)){const image=new Image();image.decoding='async';image.src=`assets/ui/errata/structures/${data.file}.webp`;structureArt.set(id,image)}
    return structureArt.get(id);
  }
  function drawStructure(context,id) {
    // Painted, gently animated structure (bottom-anchored on the interaction point).
    const painted=window.GrimoireSprites?.loopFrame(`interact_${id}`,performance.now());
    if(painted&&structures[id]){
      const size=structures[id].height*1.35;
      context.save();context.imageSmoothingEnabled=true;
      context.drawImage(painted,-size/2,-size*0.93+8,size,size);
      context.restore();return true;
    }
    const data=structures[id],image=structure(id);
    if(!data||!image?.complete||!image.naturalWidth)return false;
    const [sx,sy,sw,sh]=data.crop,width=data.height*sw/sh;
    context.save();context.imageSmoothingEnabled=true;
    context.drawImage(image,sx,sy,sw,sh,-width/2,-data.height+5,width,data.height);
    context.restore();return true;
  }
  // Start the default room while the title screen is visible so the first
  // playable frame never has to wait for its floor art.
  // Prefer the painted room; the legacy illustration only loads as a fallback.
  setTimeout(()=>{const G=window.GrimoireSprites;if(G)['frame','floor_a','floor_b','floor_c','floor_decal'].forEach(k=>G.image(`arena_reading_hall_${k}`));else room(1)},0);
  // ---- Set pieces: each wing's painted furniture along the walls, the
  // corner fires, and a ceiling layer (hanging cages, light shafts) drawn
  // above the fight. Decoration only: nothing here collides.
  // [prop, x, y, size, flip]; the playable floor spans ±1245 × ±870.
  const SET = [
    ['bookshelf',-1060,-735,250,0],['bookshelf',-770,-745,230,1],['bookshelf',780,-745,230,0],['bookshelf',1070,-735,250,1],
    ['pillar',-1165,-250,230,0],['pillar',1165,-250,230,1],['pillar',-1165,330,230,0],['pillar',1165,330,230,1],
    ['reading_desk',-720,600,200,0],['statue',760,610,230,1],['candelabra',-560,620,150,0],['candelabra',590,630,150,1],
    ['rubble',-300,790,170,0],['rubble',360,-790,150,1],['rubble',1040,120,140,0],['statue',-1040,40,190,0]
  ];
  const CAGES = [[-640,-430],[700,-360],[-180,520],[980,560]];
  function drawImg(context,img,x,y,size,flip){
    const h=size, w=size*img.naturalWidth/img.naturalHeight;
    context.save();context.translate(x,y);if(flip)context.scale(-1,1);
    context.drawImage(img,-w/2,-h*.92,w,h);context.restore();
  }
  function drawSetPieces(context,wave,inView){
    const G=window.GrimoireSprites;if(!G)return false;
    const biome=BIOMES[biomeIndex(wave)];
    context.save();context.imageSmoothingEnabled=true;
    for(const [prop,x,y,size,flip] of SET){
      if(inView&&!inView(x,y-size/2,size))continue;
      const img=G.image(`arena_${biome}_${prop}`);if(!img)continue;
      // soft contact shadow so the furniture sits on the floor
      context.fillStyle='rgba(6,4,8,.45)';context.beginPath();context.ellipse(x,y-4,size*.34,size*.08,0,0,Math.PI*2);context.fill();
      drawImg(context,img,x,y,size,flip);
    }
    context.restore();return true;
  }
  // Corner fires: an animated brazier or lectern instead of the old flat icon.
  function drawCorner(context,x,y,index){
    const frame=window.GrimoireSprites?.loopFrame(index%2?'interact_illuminated_lectern':'interact_brazier',performance.now(),index*.7);
    if(!frame)return false;
    context.save();context.imageSmoothingEnabled=true;context.drawImage(frame,x-62,y-104,124,124);context.restore();return true;
  }
  function drawCeiling(context,wave,inView){
    const G=window.GrimoireSprites;if(!G)return;
    const biome=BIOMES[biomeIndex(wave)];
    const t=performance.now()/1000;
    context.save();context.imageSmoothingEnabled=true;
    const light=G.image(`arena_${biome}_light`);
    if(light&&!flags.lowEffects){
      context.globalCompositeOperation='screen';
      context.globalAlpha=flags.reducedMotion?.22:.18+Math.sin(t*.4)*.05;
      context.drawImage(light,-1400,-1050,2800,2100);
      context.globalCompositeOperation='source-over';
    }
    const cage=G.image(`arena_${biome}_hanging_cage`);
    if(cage)CAGES.forEach(([x,y],i)=>{
      if(inView&&!inView(x,y,260))return;
      const sway=flags.reducedMotion?0:Math.sin(t*.9+i*1.7)*.07;
      context.save();context.globalAlpha=.88;context.translate(x,y-260);context.rotate(sway);
      context.drawImage(cage,-80,0,160,160*cage.naturalHeight/cage.naturalWidth);context.restore();
      // the cage's shadow on the floor drifts with it
      context.save();context.globalAlpha=.22;context.fillStyle='#000';context.beginPath();
      context.ellipse(x+Math.sin(sway)*120,y+40,56,16,0,0,Math.PI*2);context.fill();context.restore();
    });
    context.restore();
  }
  // Warm these with the room so the first wave is furnished immediately.
  setTimeout(()=>{const G=window.GrimoireSprites;if(!G)return;['reading_hall'].forEach(b=>['bookshelf','pillar','reading_desk','statue','rubble','candelabra','hanging_cage','light'].forEach(p=>G.image(`arena_${b}_${p}`)));['interact_brazier','interact_illuminated_lectern'].forEach(id=>G.strip(id))},400);
  window.ErrataArena = Object.freeze({flags,room,drawRoom,drawShadow,biomeIndex,structure,drawStructure,drawSetPieces,drawCorner,drawCeiling});
})();
