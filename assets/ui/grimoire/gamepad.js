/* Gamepad support (standard mapping).
 *
 * In combat: left stick moves (through state.touch_dir, like the touch
 * joystick), A / RT = gadget, X = arena object, LB / RB = previous / next
 * weapon, Y = inventory, Start = pause.
 * In menus: D-pad or left stick moves focus between visible buttons in
 * reading order, A presses, B closes (Escape).
 * While a pad is in use the <html> element carries .pad-active and keyboard
 * hints (<kbd>) show the painted pad buttons instead.
 */
(() => {
  const A = 0, B = 1, X = 2, Y = 3, LB = 4, RB = 5, LT = 6, RT = 7, SELECT = 8, START = 9, UP = 12, DOWN = 13, LEFT = 14, RIGHT = 15;
  const DEAD = 0.22;
  let prev = [];
  let navCooldown = 0;
  let active = false;
  let raf = 0;
  const G = () => window.GrimoireSprites;
  const S = () => (typeof state !== "undefined" ? state : null);

  // Keyboard hint -> pad button.
  const KEY_TO_PAD = { space: "a", enter: "a", shift: "a", esc: "b", escape: "b", i: "y", r: "x", m: "select", q: "lb", e: "rb", "q/e": "lb", w: "ls", a: "ls", s: "ls", d: "ls", wasd: "ls" };
  function padHints(on) {
    document.documentElement.classList.toggle("pad-active", on);
    document.querySelectorAll("kbd").forEach(k => {
      const key = (k.dataset.key || k.textContent || "").trim().toLowerCase();
      if (!k.dataset.key) k.dataset.key = key;
      const pad = KEY_TO_PAD[key];
      if (on && pad) {
        k.dataset.pad = pad;
        k.style.setProperty("--pad-art", `url("${G()?.src(`btn_pad_${pad}`) || ""}")`);
        k.dataset.padLabel = pad === "ls" ? "" : pad.toUpperCase();
      } else { delete k.dataset.pad; }
    });
  }
  function setActive(on) {
    if (active === on) return;
    active = on;
    padHints(on);
  }

  function inCombat() {
    const s = S();
    if (!s || !s.is_wave_active || s.is_inventory_open) return false;
    return !visibleOverlay();
  }
  function visibleOverlay() {
    return [...document.querySelectorAll(".screen-overlay, #quiz-modal, #story-intermission, #inventory-modal, #mistakes-modal")]
      .filter(n => !n.hidden && getComputedStyle(n).display !== "none" && getComputedStyle(n).visibility !== "hidden")
      .sort((a, b) => (Number(getComputedStyle(b).zIndex) || 0) - (Number(getComputedStyle(a).zIndex) || 0))[0] || null;
  }
  function focusables(root) {
    return [...(root || document).querySelectorAll("button:not([disabled]), [role='button'], select, input, a[href], [tabindex='0']")]
      .filter(n => { const r = n.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(n).visibility !== "hidden" && !n.closest("[hidden]"); });
  }
  // Spatial navigation: nearest focusable in the pressed direction.
  function move(dx, dy) {
    const root = visibleOverlay() || document.body;
    const list = focusables(root);
    if (!list.length) return;
    const current = document.activeElement && list.includes(document.activeElement) ? document.activeElement : null;
    if (!current) { list[0].focus({ preventScroll: false }); return; }
    const c = current.getBoundingClientRect();
    const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    let best = null, bestScore = Infinity;
    for (const n of list) {
      if (n === current) continue;
      const r = n.getBoundingClientRect();
      const x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
      const along = x * dx + y * dy;
      if (along <= 4) continue;
      const across = Math.abs(x * dy - y * dx);
      const score = along + across * 2.2;
      if (score < bestScore) { bestScore = score; best = n; }
    }
    if (best) { best.focus({ preventScroll: false }); best.scrollIntoView?.({ block: "nearest", inline: "nearest" }); }
  }
  function key(name) {
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: name, code: name, bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: name, code: name, bubbles: true }));
  }

  function poll(now) {
    raf = requestAnimationFrame(poll);
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const pad = pads[0];
    if (!pad) return;
    const pressed = pad.buttons.map(b => b.pressed || b.value > 0.5);
    const down = i => pressed[i] && !prev[i];
    const lx = Math.abs(pad.axes[0]) > DEAD ? pad.axes[0] : 0;
    const ly = Math.abs(pad.axes[1]) > DEAD ? pad.axes[1] : 0;
    if (pressed.some(Boolean) || lx || ly) setActive(true);
    const s = S();

    if (inCombat()) {
      const mag = Math.min(1, Math.hypot(lx, ly));
      if (s) s.touch_dir = mag ? { x: lx / Math.hypot(lx, ly) * mag, y: ly / Math.hypot(lx, ly) * mag } : (s._padMoving ? { x: 0, y: 0 } : s.touch_dir);
      if (s) s._padMoving = !!mag;
      if ((down(A) || down(RT)) && typeof activateActiveGadget === "function") activateActiveGadget();
      if (down(X) && typeof interactWithArenaObject === "function") interactWithArenaObject();
      if (down(LB) && typeof switchPrevWeapon === "function") switchPrevWeapon();
      if (down(RB) && typeof switchNextWeapon === "function") switchNextWeapon();
      if (down(Y) && typeof toggleInventoryModal === "function") toggleInventoryModal();
      if (down(START)) document.querySelector("[data-open-pause]")?.click();
    } else {
      if (s && s._padMoving) { s.touch_dir = { x: 0, y: 0 }; s._padMoving = false; }
      navCooldown -= 1;
      let dx = (pressed[RIGHT] ? 1 : 0) - (pressed[LEFT] ? 1 : 0);
      let dy = (pressed[DOWN] ? 1 : 0) - (pressed[UP] ? 1 : 0);
      if (!dx && !dy) { if (Math.abs(lx) > 0.6) dx = Math.sign(lx); else if (Math.abs(ly) > 0.6) dy = Math.sign(ly); }
      const fresh = down(RIGHT) || down(LEFT) || down(UP) || down(DOWN);
      if ((dx || dy) && (fresh || navCooldown <= 0)) { move(dx, dy); navCooldown = fresh ? 18 : 9; }
      if (down(A)) {
        const story = document.getElementById("story-intermission");
        if (story && !story.hidden) key("Enter");
        else document.activeElement && document.activeElement !== document.body ? document.activeElement.click() : focusables(visibleOverlay())[0]?.focus();
      }
      if (down(B)) key("Escape");
      if (down(LB)) document.activeElement?.closest?.("[role='tablist']") && move(-1, 0);
      if (down(RB)) document.activeElement?.closest?.("[role='tablist']") && move(1, 0);
      if (down(START)) { const story = document.getElementById("story-intermission"); if (story && !story.hidden) key("Escape"); }
    }
    prev = pressed;
  }

  window.addEventListener("gamepadconnected", () => { if (!raf) raf = requestAnimationFrame(poll); setActive(true); window.GrimoireMeta?.toast?.("Kumanda bağlandı", "Sol çubuk hareket · A yetenek · LB/RB silah · Start menü", G()?.src("btn_pad_a"), "route"); });
  window.addEventListener("gamepaddisconnected", () => { setActive(false); });
  ["keydown", "mousedown", "touchstart"].forEach(t => window.addEventListener(t, e => { if (e.isTrusted) setActive(false); }, { passive: true }));
  // Re-label hints that appear later (shop, guide, hub).
  new MutationObserver(() => { if (active) padHints(true); }).observe(document.documentElement, { childList: true, subtree: true });
})();
