import { Scene } from 'phaser';
import { COLORS, LAYOUT, SCENE_KEYS, TEXT } from '@core/Constants';
import { gameState } from '@core/GameState';
import { YouTubePlayables } from '@sdk/YouTubePlayables';
import { addButton, addLabel } from '@ui/Button';
import { centerCamera } from '@ui/centerCamera';

export class MainMenu extends Scene {
    constructor() {
        super(SCENE_KEYS.MAIN_MENU);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);
        centerCamera(this);

        addLabel(this, LAYOUT.TITLE_Y, TEXT.TITLE, LAYOUT.TITLE_SIZE, COLORS.ACCENT);
        addLabel(this, LAYOUT.SUBTITLE_Y, `${TEXT.BEST} ${gameState.bestScore}`, LAYOUT.BODY_SIZE);
        addButton(this, LAYOUT.BUTTON_Y, TEXT.PLAY, () => this.scene.start(SCENE_KEYS.GAME));
        addLabel(this, LAYOUT.HINT_Y, TEXT.HINT, LAYOUT.HINT_SIZE);

        // Rule #2: only once the menu accepts input.
        YouTubePlayables.gameReady();
    }
}
