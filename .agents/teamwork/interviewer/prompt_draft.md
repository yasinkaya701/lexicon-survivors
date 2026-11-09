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
