(() => {
  window.runBossStoryRuntimeRegression = async () => {
    const assert = (condition, message) => {
      if (!condition) throw new Error(`Boss story runtime regression: ${message}`);
    };
    await Promise.all([storyArcReady, storyExpansionReady]);
    const previous = { character: state.selected_char, episode: storyEpisodeIndex, panel: storyPanelIndex, wave: storyWavePending };
    let checked = 0;
    try {
      for (const characterId of Object.keys(STORY_ARC_DATA.characters)) {
        state.selected_char = characterId;
        for (let episodeIndex = 0; episodeIndex < 20; episodeIndex += 1) {
          const wave = (episodeIndex + 1) * 5;
          const expectedBoss = STORY_EXPANSION_DATA.boss_encounters[episodeIndex];
          storyEpisodeIndex = episodeIndex;
          storyPanelIndex = 0;
          storyWavePending = wave;
          renderStoryPanel();
          assert(document.getElementById("story-speaker").textContent === expectedBoss.title,
            `${characterId} at wave ${wave} should show ${expectedBoss.title}`);
          assert(document.getElementById("story-copy").textContent === expectedBoss.dialogue,
            `${characterId} at wave ${wave} should show the defeated boss's own words`);
          assert(document.getElementById("story-speaker-portrait").getAttribute("src").endsWith(expectedBoss.portrait_sprite),
            `${characterId} at wave ${wave} should show the defeated boss portrait`);
          assert(document.getElementById("story-counter").textContent === "1 / 5",
            `${characterId} at wave ${wave} should open on the first of five comic panels`);
          checked += 1;
        }
      }
    } finally {
      state.selected_char = previous.character;
      storyEpisodeIndex = previous.episode;
      storyPanelIndex = previous.panel;
      storyWavePending = previous.wave;
    }
    return { bossTestimoniesChecked: checked, characters: 6, panelsPerScene: 5, bossSpeechPanel: 1 };
  };
})();
