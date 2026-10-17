import { Scene } from 'phaser';
import { ASSET_PATHS, AUDIO_KEYS, COLORS, LAYOUT, SCENE_KEYS } from '@core/Constants';
import { YouTubePlayables } from '@sdk/YouTubePlayables';
import { centerCamera } from '@ui/centerCamera';

export class Preloader extends Scene {
    constructor() {
        super(SCENE_KEYS.PRELOADER);
    }

    init(): void {
        this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);
        centerCamera(this);

        const innerWidth = LAYOUT.LOADING_BAR_WIDTH - LAYOUT.LOADING_PAD * 2;
        this.add
            .rectangle(0, 0, LAYOUT.LOADING_BAR_WIDTH, LAYOUT.LOADING_BAR_HEIGHT)
            .setStrokeStyle(LAYOUT.LOADING_BORDER, COLORS.LOADING);
        const bar = this.add
            .rectangle(
                -innerWidth / 2,
                0,
                0,
                LAYOUT.LOADING_BAR_HEIGHT - LAYOUT.LOADING_PAD * 2,
                COLORS.LOADING
            )
            .setOrigin(0, 0.5);

        this.load.on('progress', (progress: number) => {
            bar.width = innerWidth * progress;
        });

        // Rule #2: the loading screen is the first frame the player sees.
        YouTubePlayables.firstFrameReady();
    }

    preload(): void {
        this.load.setPath(ASSET_PATHS.ROOT);
        this.load.audio(AUDIO_KEYS.PICKUP, ASSET_PATHS.PICKUP);
        this.load.audio(AUDIO_KEYS.GAME_OVER, ASSET_PATHS.GAME_OVER);
    }

    create(): void {
        this.scene.start(SCENE_KEYS.MAIN_MENU);
    }
}
