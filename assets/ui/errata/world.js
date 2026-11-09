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
    astral_astrolabe:{file:'astral-astrolabe',crop:[144,118,225,239],height:124}
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
  function drawRoom(context,wave,width,height,layout) {
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
    if(!structureArt.has(id)){const image=new Image();image.decoding='async';image.src=`assets/ui/errata/structures/${data.file}.webp`;structureArt.set(id,image)}
    return structureArt.get(id);
  }
  function drawStructure(context,id) {
    const data=structures[id],image=structure(id);
    if(!data||!image?.complete||!image.naturalWidth)return false;
    const [sx,sy,sw,sh]=data.crop,width=data.height*sw/sh;
    context.save();context.imageSmoothingEnabled=true;
    context.drawImage(image,sx,sy,sw,sh,-width/2,-data.height+5,width,data.height);
    context.restore();return true;
  }
  // Start the default room while the title screen is visible so the first
  // playable frame never has to wait for its floor art.
  room(1);
  window.ErrataArena = Object.freeze({flags,room,drawRoom,drawShadow,biomeIndex,structure,drawStructure});
})();
