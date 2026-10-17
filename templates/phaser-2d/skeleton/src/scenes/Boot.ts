import { Scene } from 'phaser';
import { COLORS, GAME_CONFIG, SCENE_KEYS, TEXT } from '@core/Constants';
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
        this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);

        // Rule #6: pause through the SDK, never the Page Visibility API. Registered first, so a
        // pause that arrives while the save is loading is not missed.
        YouTubePlayables.setOnPause(() => {
            gameState.paused = true;
            setPausedLabel(true);
            this.sound.pauseAll();
            this.game.pause();
        });
        YouTubePlayables.setOnResume(() => {
            gameState.paused = false;
            setPausedLabel(false);
            this.game.resume();
            this.sound.resumeAll();
        });

        // Rule #5: the host owns the mute state.
        this.sound.setMute(!YouTubePlayables.isAudioEnabled());
        YouTubePlayables.setAudioChangeCallback((enabled) => this.sound.setMute(!enabled));

        const loading = YouTubePlayables.loadData<GameSaveData>();
        try {
            gameState.hydrate(
                await YouTubePlayables.withTimeout(loading, GAME_CONFIG.LOAD_DATA_TIMEOUT_MS)
            );
        } catch (error) {
            console.error(error);
            // A late save still counts: the next saveData would otherwise overwrite it with defaults.
            loading
                .then((late) => {
                    if (!gameState.started) gameState.hydrate(late);
                })
                .catch(console.error);
        }

        this.scene.start(SCENE_KEYS.PRELOADER);
    }
}
