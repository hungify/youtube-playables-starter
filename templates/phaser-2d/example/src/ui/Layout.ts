import type Phaser from 'phaser';
import { GAME_CONFIG } from '@core/Constants';

export interface DesignFrame {
    readonly top: number;
    readonly bottom: number;
    readonly centerX: number;
    readonly centerY: number;
}

/**
 * The 820x1180 design frame, centered in the current game size. On screens taller than the
 * design the content block stays together in the middle instead of splitting to the edges.
 */
export function designFrame(scene: Phaser.Scene): DesignFrame {
    const { width, height } = scene.scale.gameSize;
    const top = Math.max(0, (height - GAME_CONFIG.HEIGHT) / 2);
    return {
        top,
        bottom: top + GAME_CONFIG.HEIGHT,
        centerX: width / 2,
        centerY: top + GAME_CONFIG.HEIGHT / 2
    };
}
