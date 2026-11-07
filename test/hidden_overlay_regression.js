(() => {
  window.runHiddenOverlayRegression = () => {
    const hiddenOverlays = [...document.querySelectorAll(".screen-overlay[hidden]")];
    if (!hiddenOverlays.length) throw new Error("Expected at least one hidden screen overlay");
    for (const overlay of hiddenOverlays) {
      const style = getComputedStyle(overlay);
      if (style.display !== "none") {
        throw new Error(`Hidden overlay #${overlay.id || "(unnamed)"} still displays as ${style.display}`);
      }
      if (style.pointerEvents !== "none") {
        throw new Error(`Hidden overlay #${overlay.id || "(unnamed)"} still intercepts pointer events`);
      }
    }
    const leaderboard = document.getElementById("leaderboard-overlay");
    const bounds = leaderboard.getBoundingClientRect();
    const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    if (hit === leaderboard || leaderboard.contains(hit)) {
      throw new Error("A hidden leaderboard overlay is still the top hit target");
    }
    return { hiddenCount: hiddenOverlays.length, pointerTarget: hit?.id || hit?.tagName || null };
  };
  window.runLeaderboardOverlayFlow = async () => {
    document.getElementById("title-leaderboard-btn").click();
    const overlay = document.getElementById("leaderboard-overlay");
    if (overlay.hidden || getComputedStyle(overlay).display !== "flex") {
      throw new Error("Leaderboard should become visible after its menu button is clicked");
    }
    document.getElementById("leaderboard-close-btn").click();
    if (!overlay.hidden || getComputedStyle(overlay).display !== "none") {
      throw new Error("Leaderboard should hide completely after closing");
    }
    return { opens: true, closes: true, displayAfterClose: getComputedStyle(overlay).display };
  };
})();
