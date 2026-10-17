import Phaser from 'phaser';
import { gameState } from '@core/GameState';
import { YouTubePlayables } from '@sdk/YouTubePlayables';
import { phaserGameConfig } from './config';

declare global {
    interface Window {
        render_game_to_text?: () => string;
        advanceTime?: (ms: number) => Promise<void>;
    }
}

const round = (value: number): number => Math.round(value);

export let gameInstance: Phaser.Game | null = null;

YouTubePlayables.boot(() => {
    gameInstance = new Phaser.Game(phaserGameConfig);

    // QA hook for Playwright and AI agents: a deterministic snapshot instead of pixel guessing.
    window.render_game_to_text = (): string => {
        if (!gameInstance) return JSON.stringify({ status: 'booting' });
        return JSON.stringify({
            activeScenes: gameInstance.scene.getScenes(true).map((s) => s.scene.key),
            score: gameState.score,
            bestScore: gameState.bestScore,
            combo: gameState.combo,
            timeLeftMs: round(gameState.timeLeftMs),
            player: { x: round(gameState.player.x), y: round(gameState.player.y) },
            speed: round(Math.hypot(gameState.player.vx, gameState.player.vy)),
            coin: { x: round(gameState.coin.x), y: round(gameState.coin.y) },
            started: gameState.started,
            gameOver: gameState.gameOver,
            paused: gameState.paused,
            firstFrameReady: YouTubePlayables.isFirstFrameReady(),
            gameReady: YouTubePlayables.isGameReady()
        });
    };
    window.advanceTime = (ms: number): Promise<void> =>
        new Promise<void>((resolve) => {
            window.setTimeout(resolve, ms);
        });
});
