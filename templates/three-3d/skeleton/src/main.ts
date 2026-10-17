import { DOM_IDS, GAME_CONFIG, SCREENS } from '@core/Constants';
import { EventBus, Events } from '@core/EventBus';
import { gameState } from '@core/GameState';
import type { GameSaveData } from '@core/SaveData';
import { Sfx } from '@audio/Sfx';
import { Input } from '@input/Input';
import { World } from '@render/World';
import { Hud } from '@ui/Hud';
import { YouTubePlayables } from '@sdk/YouTubePlayables';

declare global {
    interface Window {
        render_game_to_text?: () => string;
        advanceTime?: (ms: number) => Promise<void>;
    }
}

let sfx: Sfx | null = null;

window.render_game_to_text = (): string =>
    JSON.stringify({
        activeScenes: [gameState.screen],
        score: gameState.score,
        bestScore: gameState.bestScore,
        combo: gameState.combo,
        timeLeftMs: Math.round(gameState.timeLeftMs),
        player: { x: round2(gameState.orb.x), z: round2(gameState.orb.z) },
        speed: round2(Math.hypot(gameState.orb.vx, gameState.orb.vz)),
        gem: { x: round2(gameState.gem.x), z: round2(gameState.gem.z) },
        started: gameState.started,
        gameOver: gameState.gameOver,
        paused: gameState.paused,
        audioEnabled: sfx?.isEnabled() ?? false,
        firstFrameReady: YouTubePlayables.isFirstFrameReady(),
        gameReady: YouTubePlayables.isGameReady()
    });

window.advanceTime = (ms: number): Promise<void> =>
    new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
    });

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Loads the cloud save, but never blocks the menu for longer than the timeout. */
async function loadSave(): Promise<void> {
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
}

async function start(): Promise<void> {
    const parent = document.getElementById(DOM_IDS.PARENT);
    if (!parent) throw new Error(`Missing #${DOM_IDS.PARENT} in index.html`);

    const world = new World(parent);
    const input = new Input(world.canvas);
    const direction = { x: 0, z: 0 };
    const audio = new Sfx();
    sfx = audio;

    // Rule #2: the first frame is on screen, so tell the host before any slow work.
    world.render();
    YouTubePlayables.firstFrameReady();

    let frameId = 0;
    let lastTime = 0;
    const frame = (time: number): void => {
        const dtMs = Math.min(time - lastTime, GAME_CONFIG.MAX_FRAME_MS);
        lastTime = time;
        input.read(direction);
        gameState.tick(dtMs, direction.x, direction.z, Math.random);
        world.update(dtMs);
        hud.update();
        world.render();
        frameId = requestAnimationFrame(frame);
    };
    const startLoop = (): void => {
        lastTime = performance.now();
        frameId = requestAnimationFrame(frame);
    };

    const hud = new Hud(() => {
        audio.unlock();
        gameState.startRun(Math.random);
    });

    // Rule #6: pause through the SDK, never the Page Visibility API.
    YouTubePlayables.setOnPause(() => {
        gameState.paused = true;
        cancelAnimationFrame(frameId);
        input.release();
        audio.setPaused(true);
        hud.setPaused(true);
    });
    YouTubePlayables.setOnResume(() => {
        gameState.paused = false;
        audio.setPaused(false);
        hud.setPaused(false);
        startLoop();
    });

    EventBus.on(Events.GEM_COLLECTED, () => {
        audio.pickup();
        world.pop();
    });
    EventBus.on(Events.GAME_OVER, ({ score }) => {
        audio.gameOver();
        YouTubePlayables.sendScore(score);
        YouTubePlayables.saveData(gameState.toSaveData()).catch(console.error);
    });

    await loadSave();

    gameState.setScreen(SCREENS.MENU);
    hud.show(SCREENS.MENU);
    if (!gameState.paused) startLoop();

    // Rule #2: only once the menu accepts input.
    YouTubePlayables.gameReady();
}

YouTubePlayables.boot(() => {
    start().catch((error: unknown) => {
        console.error(error);
        YouTubePlayables.logError();
    });
});
