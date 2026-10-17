import Phaser from 'phaser';
import { ARENA } from '@core/Constants';
import { gameState } from '@core/GameState';
import { YouTubePlayables } from '@sdk/YouTubePlayables';
import { hapticsSupported } from '@lib/Haptics';
import { phaserGameConfig } from './config';

declare global {
    interface Window {
        render_game_to_text?: () => string;
        advanceTime?: (ms: number) => Promise<void>;
    }
}

function nearestZombies(): Array<{ x: number; y: number; boss: boolean }> {
    const found: Array<{ x: number; y: number; boss: boolean; d: number }> = [];
    for (let i = 0; i < gameState.radarCount; i++) {
        const x = gameState.radar[i * ARENA.RADAR_STRIDE] ?? 0;
        const y = gameState.radar[i * ARENA.RADAR_STRIDE + 1] ?? 0;
        const boss = gameState.radar[i * ARENA.RADAR_STRIDE + 2] === 1;
        found.push({
            x: Math.round(x),
            y: Math.round(y),
            boss,
            d: Math.hypot(x - gameState.playerX, y - gameState.playerY)
        });
    }

    // Selection instead of sort: no newer Array APIs, so older WebViews can run the QA hooks too.
    const nearest: Array<{ x: number; y: number; boss: boolean }> = [];
    while (nearest.length < ARENA.QA_NEAREST_ZOMBIES && found.length > 0) {
        let best = 0;
        for (let i = 1; i < found.length; i++) {
            if ((found[i]?.d ?? Infinity) < (found[best]?.d ?? Infinity)) best = i;
        }
        const [closest] = found.splice(best, 1);
        if (closest) nearest.push({ x: closest.x, y: closest.y, boss: closest.boss });
    }
    return nearest;
}

export let gameInstance: Phaser.Game | null = null;

YouTubePlayables.boot(() => {
    gameInstance = new Phaser.Game(phaserGameConfig);

    window.render_game_to_text = (): string => {
        if (!gameInstance) return JSON.stringify({ status: 'booting' });
        const activeScenes = gameInstance.scene.getScenes(true).map((s) => s.scene.key);
        return JSON.stringify({
            activeScenes,
            score: gameState.score,
            bestScore: gameState.bestScore,
            wave: gameState.wave,
            zombiesLeft: gameState.remaining,
            health: Math.round(gameState.health),
            player: { x: Math.round(gameState.playerX), y: Math.round(gameState.playerY) },
            speed: Math.round(gameState.speed),
            nearestZombies: nearestZombies(),
            smashes: gameState.smashes,
            scrap: gameState.scrap,
            haptics: gameState.hapticsEnabled,
            hapticsSupported: hapticsSupported(),
            upgrades: gameState.upgrades,
            combo: gameState.combo,
            nitroMs: Math.round(gameState.nitroMs),
            activeCar: gameState.activeCar,
            started: gameState.started,
            gameOver: gameState.gameOver,
            firstFrameReady: YouTubePlayables.isFirstFrameReady(),
            gameReady: YouTubePlayables.isGameReady()
        });
    };
    window.advanceTime = (ms: number): Promise<void> =>
        new Promise<void>((resolve) => {
            window.setTimeout(resolve, ms);
        });
});
