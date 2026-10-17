import { Scene } from 'phaser';
import { GAME_CONFIG, SCENE_KEYS, TEXT, VISUALS } from '@core/Constants';
import { gameState } from '@core/GameState';
import type { GameSaveData } from '@core/SaveData';
import { YouTubePlayables } from '@sdk/YouTubePlayables';

/** Shows or hides the DOM "PAUSED" label so a paused game never looks frozen or crashed. */
function setPausedLabel(visible: boolean): void {
    const label = document.getElementById('paused');
    if (!label) return;

    label.textContent = TEXT.PAUSED;
    label.toggleAttribute('hidden', !visible);
}

export class Boot extends Scene {
    constructor() {
        super(SCENE_KEYS.BOOT);
    }

    async create(): Promise<void> {
        this.cameras.main.setBackgroundColor(VISUALS.OUTSIDE_COLOR);

        // Registered first, so a pause that arrives while the save is loading is not missed.
        YouTubePlayables.setOnPause(() => {
            gameState.paused = true;
            setPausedLabel(true);
            this.game.pause();
        });

        YouTubePlayables.setOnResume(() => {
            gameState.paused = false;
            setPausedLabel(false);
            this.game.resume();
        });

        const loading = YouTubePlayables.loadData<GameSaveData>();
        try {
            const data = await YouTubePlayables.withTimeout(
                loading,
                GAME_CONFIG.LOAD_DATA_TIMEOUT_MS
            );
            gameState.hydrate(data);
        } catch (error) {
            console.error(error);

            // The SDK marks the save as loaded once it finally arrives, and the next saveData would
            // overwrite it with fresh defaults. Apply the late save so that progress is not lost.
            loading
                .then((late) => {
                    if (!gameState.started) gameState.hydrate(late);
                })
                .catch(console.error);
        }

        this.scene.start(SCENE_KEYS.PRELOADER);
    }
}
