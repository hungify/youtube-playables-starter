import { Scene } from 'phaser';
import { ASSET_KEYS, ASSET_PATHS, AUDIO_KEYS, LAYOUT, SCENE_KEYS, VISUALS } from '@core/Constants';
import { generateArenaTextures } from '@objects/ArenaTextures';
import { YouTubePlayables } from '@sdk/YouTubePlayables';

export class Preloader extends Scene {
    constructor() {
        super(SCENE_KEYS.PRELOADER);
    }

    init(): void {
        this.cameras.main.setBackgroundColor(VISUALS.OUTSIDE_COLOR);

        const width = this.scale.width;
        const cx = width / 2;
        const cy = this.scale.height / 2;
        const barOuterWidth = width * LAYOUT.LOADING_BAR_RATIO;
        const barWidth = barOuterWidth - LAYOUT.LOADING_PAD;

        this.add
            .rectangle(cx, cy, barOuterWidth, LAYOUT.LOADING_BAR_HEIGHT)
            .setStrokeStyle(LAYOUT.LOADING_BORDER, LAYOUT.LOADING_COLOR);
        const bar = this.add.rectangle(
            cx - barWidth / 2 + LAYOUT.LOADING_PAD / 2,
            cy,
            LAYOUT.LOADING_PAD,
            LAYOUT.LOADING_FILL_HEIGHT,
            LAYOUT.LOADING_COLOR
        );

        this.load.on('progress', (progress: number) => {
            bar.width = barWidth * progress;
        });

        YouTubePlayables.firstFrameReady();
    }

    preload(): void {
        this.load.setPath(ASSET_PATHS.ROOT);
        this.load.image(ASSET_KEYS.AUDIO_ON, 'audio-on.png');
        this.load.image(ASSET_KEYS.AUDIO_OFF, 'audio-off.png');

        this.load.setPath(ASSET_PATHS.FX);
        for (const key of Object.values(AUDIO_KEYS)) {
            this.load.audio(key, `${key}.wav`);
        }
    }

    create(): void {
        generateArenaTextures(this);

        this.scene.launch(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.MAIN_MENU);
    }
}
