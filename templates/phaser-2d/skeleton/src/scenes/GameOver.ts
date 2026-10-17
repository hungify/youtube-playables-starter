import { Scene } from 'phaser';
import { COLORS, LAYOUT, SCENE_KEYS, TEXT } from '@core/Constants';
import { gameState } from '@core/GameState';
import { YouTubePlayables } from '@sdk/YouTubePlayables';
import { addButton, addLabel } from '@ui/Button';
import { centerCamera } from '@ui/centerCamera';

export class GameOver extends Scene {
    constructor() {
        super(SCENE_KEYS.GAME_OVER);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);
        centerCamera(this);

        const title = gameState.newBest ? TEXT.NEW_BEST : TEXT.TIME_UP;
        addLabel(this, LAYOUT.TITLE_Y, title, LAYOUT.TITLE_SIZE, COLORS.ACCENT);
        addLabel(
            this,
            LAYOUT.SUBTITLE_Y,
            `${TEXT.SCORE} ${gameState.score}\n${TEXT.BEST} ${gameState.bestScore}`,
            LAYOUT.BODY_SIZE
        );
        addButton(this, LAYOUT.BUTTON_Y, TEXT.PLAY_AGAIN, () => this.scene.start(SCENE_KEYS.GAME));

        YouTubePlayables.sendScore(gameState.score);
        YouTubePlayables.saveData(gameState.toSaveData()).catch(console.error);
    }
}
