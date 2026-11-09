/* Cache battle-dock nodes; redraw labels only when their visible value changes. */
(() => {
  const button=document.getElementById('touch-gadget-btn');
  const icon=button?.querySelector('img');
  const name=document.getElementById('combat-gadget-name');
  const status=document.getElementById('combat-gadget-status');
  let previous='';
  function update({gadget,remaining=0,duration}={}){
    if(!button||!gadget)return;
    const tenths=Math.max(0,Math.ceil(remaining*10));
    const total=Number(duration)||gadget.cooldown||1;
    const key=`${gadget.name}|${tenths}|${total}`;
    if(previous===key)return;previous=key;
    const ready=tenths===0;
    if(name.textContent!==gadget.name)name.textContent=gadget.name;
    const text=ready?'HAZIR':`${(tenths/10).toFixed(1)} sn`;
    if(status.textContent!==text)status.textContent=text;
    const path=gadget.icon||gadget.sprite||'assets/sprites/gadgets/eraser_dash.png';
    const src=path.startsWith('assets/')?path:`assets/sprites/${path}`;
    if(icon.getAttribute('src')!==src)icon.src=src;
    button.classList.toggle('is-cooling',!ready);
    if(button.getAttribute('aria-disabled')!==String(!ready))button.setAttribute('aria-disabled',String(!ready));
    const label=`${gadget.name} · ${ready?'Hazır, gereci kullan':'Gereç yeniden hazırlanıyor'} · Space`;
    if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
    button.style.setProperty('--gadget-ready',String(ready?1:Math.max(0,Math.min(1,1-remaining/total))));
  }
  window.ErrataCombat=Object.freeze({update});
})();
