async page => {
  const url = new URL(page.url());
  const shouldProfile = url.searchParams.has("profile");
  const baseUrl = url.hostname === "127.0.0.1"
    ? `${url.origin}/`
    : "https://yasinkaya701.github.io/lexicon-survivors/";
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(baseUrl + (shouldProfile ? "?profile=1" : ""));
  await page.waitForFunction(() => typeof window.startGame === "function"
    && typeof window.render_game_to_text === "function" && state.questions?.length === 1000,
  undefined, { timeout: 45000 });

  const setup = await page.evaluate(() => {
    state.difficulty = "hard";
    state.selected_char = "inky";
    document.getElementById("title-screen").style.display = "none";

    let seed = 0x5eed2026;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    startGame();
    state.current_wave = 60;
    state.wave_duration = 600;
    state.wave_time_left = 600;
    state.milestone_boss_delay = 999;
    state.hp = state.max_hp = 1e7;
    state.game_speed = 1;
    state.projectile_count = 4;
    state.pierce_count = 4;

    for (let i = 0; i < 150; i++) spawnEnemy();
    state.enemies.forEach((enemy, i) => {
      const angle = i * 2.399963229728653;
      const radius = 240 + (i % 5) * 58;
      enemy.x = Math.cos(angle) * radius;
      enemy.y = Math.sin(angle) * radius;
      enemy.vx = 0;
      enemy.vy = 0;
      enemy.hp = enemy.max_hp = 1e8;
      enemy.dead = false;
      enemy.affix = i < 14 ? "commander" : null;
      if ("shoot_cooldown" in enemy) enemy.shoot_cooldown = 999;
    });

    for (let i = 0; i < 128; i++) {
      const angle = i * 2.399963229728653;
      const radius = 90 + (i % 4) * 18;
      spawnProjectile({
        type: "quill_test", x: Math.cos(angle) * radius, y: Math.sin(angle) * radius,
        dx: Math.cos(angle), dy: Math.sin(angle), dmg: 0, pierce: 500,
        spd: 0, size: 8, lifetime: 600, weapon_id: "quill_blaster", test: true
      });
    }
    for (let i = 0; i < 128; i++) {
      const angle = i * 2.399963229728653;
      const radius = 520 + (i % 4) * 24;
      const projectile = spawnEnemyProjectile(Math.cos(angle) * radius, Math.sin(angle) * radius,
        -Math.cos(angle), -Math.sin(angle), 0, 0);
      projectile.lifetime = 600;
    }

    const metric = {
      active: false, raf: [], update: [], render: [], longTasks: [],
      start: 0, end: 0, previousRaf: null, gcObserverSupported: false
    };
    window.__denseWaveMetric = metric;
    const originalUpdate = window.updateGame;
    const originalRender = window.render;
    window.updateGame = function (...args) {
      const start = performance.now();
      try { return originalUpdate.apply(this, args); }
      finally { if (metric.active) metric.update.push(performance.now() - start); }
    };
    window.render = function (...args) {
      const start = performance.now();
      try { return originalRender.apply(this, args); }
      finally { if (metric.active) metric.render.push(performance.now() - start); }
    };
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (metric.active) metric.longTasks.push({ start: entry.startTime, duration: entry.duration });
        }
      });
      observer.observe({ type: "longtask", buffered: false });
      window.__denseWaveLongTaskObserver = observer;
    }
    metric.gcObserverSupported = PerformanceObserver.supportedEntryTypes.includes("gc");

    const sampleRaf = now => {
      if (metric.active) {
        if (metric.previousRaf !== null) metric.raf.push(now - metric.previousRaf);
        metric.previousRaf = now;
      } else metric.previousRaf = null;
      requestAnimationFrame(sampleRaf);
    };
    requestAnimationFrame(sampleRaf);
    return {
      wave: state.current_wave, difficulty: state.difficulty, active: state.is_wave_active,
      enemies: state.enemies.filter(enemy => !enemy.dead).length,
      commanders: state.enemies.filter(enemy => enemy.affix === "commander").length,
      projectiles: state.projectiles.length, enemyProjectiles: state.enemy_projectiles.length,
      viewport: [innerWidth, innerHeight], dpr: devicePixelRatio,
      canvas: [document.getElementById("game-canvas").width, document.getElementById("game-canvas").height],
      renderScale: JSON.parse(window.render_game_to_text()).render_quality,
      gcObserverSupported: metric.gcObserverSupported
    };
  });

  await page.waitForTimeout(5000);
  let cdp;
  const traceEvents = [];
  if (shouldProfile) {
    cdp = await page.context().newCDPSession(page);
    cdp.on("Tracing.dataCollected", event => traceEvents.push(...event.value));
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.start", { samplingInterval: 1000 });
    await cdp.send("Tracing.start", {
      categories: "devtools.timeline,v8,disabled-by-default-v8.gc",
      options: "record-as-much-as-possible", transferMode: "ReportEvents"
    });
  }
  await page.evaluate(() => {
    const metric = window.__denseWaveMetric;
    metric.raf.length = 0;
    metric.update.length = 0;
    metric.render.length = 0;
    metric.longTasks.length = 0;
    metric.previousRaf = null;
    metric.start = performance.now();
    metric.active = true;
  });

  const directions = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
  for (let second = 0; second < 35; second++) {
    const key = directions[second % directions.length];
    await page.keyboard.down(key);
    await page.waitForTimeout(1000);
    await page.keyboard.up(key);
  }
  await page.evaluate(() => {
    const metric = window.__denseWaveMetric;
    metric.active = false;
    metric.end = performance.now();
  });
  await page.waitForTimeout(100);

  let profileSummary = null;
  let gcSummary = null;
  if (shouldProfile) {
    const profile = await cdp.send("Profiler.stop");
    const traceDone = new Promise(resolve => cdp.once("Tracing.tracingComplete", resolve));
    await cdp.send("Tracing.end");
    await traceDone;
    const nodes = new Map(profile.profile.nodes.map(node => [node.id, node]));
    const selfMicros = new Map();
    profile.profile.samples.forEach((nodeId, i) => {
      const frame = nodes.get(nodeId)?.callFrame;
      if (!frame) return;
      const key = `${frame.url} :: ${frame.functionName} @ ${frame.lineNumber + 1}`;
      selfMicros.set(key, (selfMicros.get(key) || 0) + (profile.profile.timeDeltas?.[i] || 0));
    });
    const tracedGc = traceEvents.filter(event => ["MinorGC", "MajorGC"]
      .includes(event.name) && event.ph === "X" && Number.isFinite(event.dur) && event.dur > 0);
    const gcByName = Object.groupBy ? Object.groupBy(tracedGc, event => event.name)
      : tracedGc.reduce((groups, event) => ((groups[event.name] ||= []).push(event), groups), {});
    profileSummary = {
      sampleCount: profile.profile.samples.length,
      functions: [...selfMicros].sort((a, b) => b[1] - a[1]).slice(0, 25)
        .map(([functionName, microseconds]) => ({ functionName, selfMs: +(microseconds / 1000).toFixed(2) })),
      traceEventCount: traceEvents.length
    };
    gcSummary = {
      eventCount: tracedGc.length,
      totalMs: +(tracedGc.reduce((sum, event) => sum + event.dur, 0) / 1000).toFixed(2),
      maxMs: +((Math.max(0, ...tracedGc.map(event => event.dur))) / 1000).toFixed(2),
      byName: Object.fromEntries(Object.entries(gcByName).map(([name, events]) => [name, {
        count: events.length,
        totalMs: +(events.reduce((sum, event) => sum + event.dur, 0) / 1000).toFixed(2),
        maxMs: +((Math.max(0, ...events.map(event => event.dur))) / 1000).toFixed(2)
      }]))
    };
    await cdp.detach();
  }

  const result = await page.evaluate(({ setup, profileSummary, gcSummary }) => {
    const metric = window.__denseWaveMetric;
    const summarize = values => {
      if (!values.length) return { count: 0, mean: 0, p95: 0, p99: 0, max: 0 };
      const sorted = [...values].sort((a, b) => a - b);
      const percentile = p => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
      return {
        count: values.length,
        mean: +(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3),
        p95: +percentile(0.95).toFixed(3), p99: +percentile(0.99).toFixed(3),
        max: +sorted[sorted.length - 1].toFixed(3)
      };
    };
    const wallSeconds = (metric.end - metric.start) / 1000;
    return {
      profile: new URL(location.href).searchParams.has("profile"),
      setup,
      runtime: {
        wallSeconds: +wallSeconds.toFixed(3), fps: +(metric.raf.length / wallSeconds).toFixed(2),
        rafMs: summarize(metric.raf), updateMs: summarize(metric.update), renderMs: summarize(metric.render),
        totalGameWorkMs: summarize(metric.update.map((value, index) => value + (metric.render[index] || 0))),
        framesOver16_7ms: metric.raf.filter(value => value > 16.7).length,
        framesOver50ms: metric.raf.filter(value => value > 50).length,
        longTaskCount: metric.longTasks.length,
        longTaskMaxMs: +(Math.max(0, ...metric.longTasks.map(task => task.duration))).toFixed(2),
        final: {
          wave: state.current_wave,
          enemies: state.enemies.filter(enemy => !enemy.dead).length,
          playerProjectiles: state.projectiles.length,
          enemyProjectiles: state.enemy_projectiles.length,
          renderScale: JSON.parse(window.render_game_to_text()).render_quality,
          frameCosts: JSON.parse(window.render_game_to_text()).frame_cost_ms,
          player: { x: +state.player.x.toFixed(1), y: +state.player.y.toFixed(1) }
        }
      },
      gcObserverSupported: metric.gcObserverSupported,
      profileSummary,
      gcSummary
    };
  }, { setup, profileSummary, gcSummary });
  return result;
}
