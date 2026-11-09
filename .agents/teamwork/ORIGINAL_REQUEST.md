# Original User Request

## Initial Request — 2026-11-07T17:54:31Z

This is a single self-contained fix; keep it small and focused. Add a return-to-main-menu button upon game completion/game over and a sound mute toggle option in the settings or pause menu for Lexicon Survivors (https://yasinkaya701.github.io/lexicon-survivors/).

Working directory: /Users/afurkanmac/Downloads/hackhaton
Integrity mode: development

## Requirements

### R1. Return to Main Menu on Game End
Provide a button on the game end screen (both game over and victory screens) that allows the player to return to the main menu. Returning to the main menu must reset active run data so that a subsequent game starts cleanly.

### R2. Sound Mute Control
Provide a sound toggle option in the settings or pause menu that mutes and unmutes all game audio.

## Acceptance Criteria

### Navigation
- [ ] A visible button to return to the main menu is present on both the game over and victory screens.
- [ ] Selecting the return-to-main-menu button returns the player to the main menu without application errors.
- [ ] Starting a new game after returning to the main menu initializes a fresh game state without residual state from the previous run.

### Audio Control
- [ ] A sound toggle option is available within the pause or settings menu.
- [ ] Toggling sound off mutes all game audio.
- [ ] Toggling sound on restores game audio.

### Verification
- [ ] Existing automated test suites pass without regression.
- [ ] The game builds cleanly and changes are verifiable in the runtime environment.


## Follow-up — 2026-11-07T17:55:07Z

Important requirement addition from user to incorporate into execution:
"ses efektlerini ana menü sesini oyun içi müziği vs tüm sesler için ayrı ayrı ayarlama açma kapama kısımları bulunsunbuı şekilde onaylıyorum"

Please ensure the audio controls are granular:
- Sound effects (SFX) toggle and volume adjustment
- In-game music (BGM) toggle and volume adjustment
- Main menu music / UI sounds toggle and volume adjustment
- Master mute / volume control


## Follow-up — 2026-11-07T18:00:06Z

Additional user requirement:
"ana menüye dönme olayında kullanıcı oyunun ortasında da pause tuşuyla oyunu durdurup ana menüye dönebilmeli"

Translation & requirement detail:
In addition to returning to the main menu on the game-over and victory screens, the player must also be able to pause the game in the middle of a run (via the pause key / pause menu) and return to the main menu directly from the pause screen, resetting the active run state cleanly.


## Follow-up — 2026-11-07T18:01:02Z

Additional user requirement:
"sesleri de aynı şekilde oyun ortsında pause tuşuyla durdurup açılan ekranda değiştirebilmeli başka ayarları da değiştirebilmeli"

Translation & requirement detail:
Within the pause screen/modal (accessible mid-game):
1. The granular sound controls (Master, SFX, BGM, Menu music toggles & volume sliders) must be directly accessible and adjustable while paused.
2. Other settings (such as screen shake, display/performance or controls) should also be accessible/configurable from this pause settings interface.
3. Player can adjust these settings on the fly, resume the run with new settings applied, or return to the main menu.
