import type Phaser from 'phaser';
import { TOUCH } from '@core/Constants';

/** Smallest touch target edge in game pixels for the current canvas scale (48dp). */
export function minTouchSize(scene: Phaser.Scene): number {
    return TOUCH.MIN_TARGET_DP * Math.max(scene.scale.displayScale.x, scene.scale.displayScale.y);
}

/** Gap between neighbouring touch targets in game pixels (8dp). */
export function touchGap(scene: Phaser.Scene): number {
    return TOUCH.GAP_DP * Math.max(scene.scale.displayScale.x, scene.scale.displayScale.y);
}

/** Vertical padding per side that grows a piece of content up to a 48dp-tall target. */
export function touchPaddingY(scene: Phaser.Scene, contentHeight: number): number {
    return Math.max(0, (minTouchSize(scene) - contentHeight) / 2);
}
