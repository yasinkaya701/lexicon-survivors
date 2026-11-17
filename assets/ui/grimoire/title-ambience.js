/* Title ambience: ash and torn page flakes rise from the erased archive.
   Runs only while the title overlay is visible; honours reduced motion. */
(() => {
  const title = document.getElementById('title-screen');
  if (!title) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'title-ambience';
  canvas.setAttribute('aria-hidden', 'true');
  title.prepend(canvas);
  const ctx = canvas.getContext('2d');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('errata-reduced-motion');
  let w = 0, h = 0, dpr = 1, flakes = [], raf = 0, last = 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = title.clientWidth; h = title.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function spawn(initial) {
    const ember = Math.random() < 0.12;
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: ember ? 1 + Math.random() * 1.4 : 1.2 + Math.random() * 3.2,
      vy: -(8 + Math.random() * 22),
      vx: -4 + Math.random() * 8,
      spin: Math.random() * Math.PI,
      vs: (-1 + Math.random() * 2) * 0.8,
      sway: Math.random() * Math.PI * 2,
      ember,
      alpha: 0.15 + Math.random() * 0.45
    };
  }
  let fog = [];
  function seed() {
    const count = Math.round(Math.min(90, (w * h) / 16000));
    flakes = Array.from({ length: count }, () => spawn(true));
    fog = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * w, y: h * (.55 + Math.random() * .45), r: 260 + Math.random() * 320, vx: 6 + Math.random() * 10, a: .05 + Math.random() * .06 }));
  }
  const puff = document.createElement('canvas');
  puff.width = puff.height = 256;
  (() => { const p = puff.getContext('2d'); const g = p.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, 'rgba(150,140,130,1)'); g.addColorStop(1, 'rgba(150,140,130,0)'); p.fillStyle = g; p.fillRect(0, 0, 256, 256); })();
  function drawFog(dt) {
    for (const f of fog) {
      f.x += f.vx * dt;
      if (f.x - f.r > w) f.x = -f.r;
      ctx.globalAlpha = f.a;
      ctx.drawImage(puff, f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    ctx.globalAlpha = 1;
  }
  function frame(now) {
    raf = 0;
    if (title.hidden || title.style.display === 'none' || !title.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    ctx.clearRect(0, 0, w, h);
    drawFog(dt);
    for (const f of flakes) {
      f.sway += dt * 0.9;
      f.x += (f.vx + Math.sin(f.sway) * 6) * dt;
      f.y += f.vy * dt;
      f.spin += f.vs * dt;
      if (f.y < -12 || f.x < -20 || f.x > w + 20) Object.assign(f, spawn(false));
      const fade = Math.min(1, f.y / (h * 0.35));
      ctx.globalAlpha = f.alpha * fade;
      if (f.ember) {
        ctx.fillStyle = '#E4583E';
        ctx.shadowColor = 'rgba(228,88,62,.8)'; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.spin);
        ctx.fillStyle = '#D9CDB2';
        ctx.fillRect(-f.r, -f.r * 0.55, f.r * 2, f.r * 1.1);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    schedule();
  }
  function schedule() { if (!raf && !reduced()) raf = requestAnimationFrame(frame); }
  resize(); seed(); schedule();
  addEventListener('resize', () => { resize(); seed(); });
  new MutationObserver(() => schedule()).observe(title, { attributes: true, attributeFilter: ['hidden', 'style'] });
})();
