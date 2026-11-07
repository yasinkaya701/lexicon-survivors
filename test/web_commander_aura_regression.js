(() => {
  window.runCommanderAuraRegression = () => {
    const originalEnemies = state.enemies;
    const commander = { affix: "commander", x: 0, y: 0, dead: false, is_buffed: true };
    const friend = { x: 80, y: 80, dead: false, is_buffed: false };
    const edge = { x: 159.9, y: 0, dead: false, is_buffed: false };
    const outside = { x: 160, y: 0, dead: false, is_buffed: true };
    const secondCommander = { affix: "commander", x: 640, y: 0, dead: false, is_buffed: false };
    const secondFriend = { x: 720, y: 0, dead: false, is_buffed: false };
    try {
      state.enemies = [commander, friend, edge, outside, secondCommander, secondFriend];
      updateCommanderAuras(state.enemies);
      if (commander.is_buffed) throw new Error("A commander must not buff itself");
      if (!friend.is_buffed || !edge.is_buffed || !secondFriend.is_buffed) throw new Error("Enemies inside a commander radius must be buffed");
      if (outside.is_buffed) throw new Error("Enemies at or beyond 160 units must not be buffed");
      updateCommanderAuras([outside]);
      if (outside.is_buffed) throw new Error("Stale aura flags must clear when no commander remains");
      let seed = 113;
      const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (let layout = 0; layout < 24; layout++) {
        const crowd = Array.from({ length: 220 }, () => ({
          x: (random() * 2 - 1) * 1250,
          y: (random() * 2 - 1) * 900,
          dead: random() < 0.04,
          affix: random() < 0.5 ? "commander" : undefined,
          is_buffed: false
        }));
        const expected = new Set();
        for (const aura of crowd) {
          if (aura.affix !== "commander" || aura.dead) continue;
          for (const other of crowd) {
            if (other === aura || other.dead) continue;
            const dx = other.x - aura.x;
            const dy = other.y - aura.y;
            if (dx * dx + dy * dy < 160 * 160) expected.add(other);
          }
        }
        updateCommanderAuras(crowd);
        const actual = crowd.filter(enemy => enemy.is_buffed);
        if (expected.size !== actual.length || actual.some(enemy => !expected.has(enemy))) {
          throw new Error(`Spatial aura result diverged in randomized 220-enemy layout ${layout + 1}`);
        }
      }
      return { buffed: [friend.is_buffed, edge.is_buffed, secondFriend.is_buffed], boundaryOutside: outside.is_buffed, randomizedLayoutsCompared: 24 };
    } finally {
      state.enemies = originalEnemies;
    }
  };
})();
