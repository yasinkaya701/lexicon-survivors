/* The route and clock are presentation of the authoritative wave state. */
(() => {
  const track=document.getElementById('archive-progress-track');
  const route='M10 18C55 3 75 3 105 18S175 33 200 18S275 3 300 18S365 33 390 18';
  const svg=`<svg viewBox="0 0 400 36" preserveAspectRatio="none" aria-hidden="true"><path d="${route}" fill="none" stroke="#ab927066" stroke-width="1.5" stroke-dasharray="3 3"/><path id="archive-path-progress" d="${route}" pathLength="100" fill="none" stroke="#d6b87f" stroke-width="2" stroke-dasharray="0 100"/></svg>`;
  const stops=[{wave:1,label:'Karanlık Kütüphane',icon:'book'},{wave:26,label:'Söz Dehlizi',icon:'shield'},{wave:51,label:'Astral Gözlemevi',icon:'artifact'},{wave:76,label:'Son Sayfa',icon:'quill'},{wave:100,label:'Son mühür',icon:'open_archive'}];
  if(track){track.insertAdjacentHTML('beforeend',svg);for(const [index,stop]of stops.entries()){const node=document.createElement('span');node.className='route-stop';node.title=`${stop.label} · ${stop.wave}. dalga`;node.style.left=`${2.5+index*23.75}%`;node.setAttribute('aria-hidden','true');const image=document.createElement('img');image.src=`assets/ui/icons/${stop.icon}.svg`;image.alt='';node.append(image);track.append(node)}}
  const timer=document.getElementById('timer-badge');
  if(timer)timer.innerHTML='<span class="timer-place" id="hud-biome-name"></span><strong class="timer-wave"><span id="hud-wave-number">1</span><small>/100</small></strong><span class="timer-clock"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12M6 21h12M8 4v4l8 8v4M16 4v4l-8 8v4M9 7h6M9 18h6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span id="hud-seconds">22s</span></span>';
  let lastWave=-1;
  function put(id,value){const element=document.getElementById(id);const text=String(value);if(element&&element.textContent!==text)element.textContent=text}
  function updateTimer(biome,wave,seconds){put('hud-biome-name',biome);put('hud-wave-number',wave);put('hud-seconds',`${seconds}s`)}
  function updateRoute(wave){if(lastWave===wave)return;lastWave=wave;const line=document.getElementById('archive-path-progress');if(line)line.setAttribute('stroke-dasharray',`${Math.max(0,Math.min(100,(wave-1)/99*100))} 100`);track?.querySelectorAll('.route-stop').forEach((node,index)=>{node.classList.toggle('is-reached',wave>=stops[index].wave);node.classList.toggle('is-current',wave>=stops[index].wave&&(index===4||wave<stops[index+1].wave))})}
  window.ErrataHUD=Object.freeze({updateTimer,updateRoute});
})();
