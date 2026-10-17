import type Phaser from 'phaser';

/**
 * Keeps the world origin in the middle of the screen. With Scale.EXPAND the visible area grows
 * around the 820x1180 design area, so layouts written around (0, 0) stay centred on every ratio.
 */
export function centerCamera(scene: Phaser.Scene): void {
    const center = (): void => {
        scene.cameras.main.centerOn(0, 0);
    };
    center();
    scene.scale.on('resize', center);
    scene.events.once('shutdown', () => scene.scale.off('resize', center));
}
