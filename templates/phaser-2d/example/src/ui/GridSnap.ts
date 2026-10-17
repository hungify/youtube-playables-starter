import Phaser from 'phaser';

export type SnapPosition =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right'
    | 'custom';

export interface SnapCell {
    x: number;
    y: number;
    originX: number;
    originY: number;
    px: number;
    py: number;
}

export interface SnapEntry extends SnapCell {
    offsetX: number;
    offsetY: number;
}

export interface SnappableGameObject {
    setPosition(x?: number, y?: number): this;
    setOrigin(x?: number, y?: number): this;
}

export class GridSnap {
    static readonly TOP_LEFT: SnapPosition = 'top-left';
    static readonly TOP_CENTER: SnapPosition = 'top-center';
    static readonly TOP_RIGHT: SnapPosition = 'top-right';
    static readonly CENTER_LEFT: SnapPosition = 'center-left';
    static readonly CENTER_CENTER: SnapPosition = 'center';
    static readonly CENTER_RIGHT: SnapPosition = 'center-right';
    static readonly BOTTOM_LEFT: SnapPosition = 'bottom-left';
    static readonly BOTTOM_CENTER: SnapPosition = 'bottom-center';
    static readonly BOTTOM_RIGHT: SnapPosition = 'bottom-right';
    static readonly CUSTOM: SnapPosition = 'custom';

    readonly scene: Phaser.Scene;
    readonly gridWidth: number;
    readonly gridHeight: number;
    paddingX = 0;
    paddingY = 0;
    readonly sprites = new Map<SnappableGameObject, SnapEntry>();

    constructor(scene: Phaser.Scene, gridWidth = 3, gridHeight = 3) {
        this.scene = scene;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;

        scene.scale.on('resize', this.resize, this);
    }

    destroy(): void {
        this.scene.scale.off('resize', this.resize, this);
        this.sprites.clear();
    }

    setPadding(x: number, y: number): this {
        this.paddingX = x;
        this.paddingY = y;
        return this;
    }

    getIndex(position: SnapPosition): SnapCell {
        const width = this.gridWidth;
        const height = this.gridHeight;

        switch (position) {
            case GridSnap.TOP_LEFT:
                return { x: 0, y: 0, originX: 0, originY: 0, px: 1, py: 1 };
            case GridSnap.TOP_CENTER:
                return { x: Math.floor(width / 2), y: 0, originX: 0.5, originY: 0, px: 0, py: 1 };
            case GridSnap.TOP_RIGHT:
                return { x: width - 1, y: 0, originX: 1, originY: 0, px: -1, py: 1 };
            case GridSnap.CENTER_LEFT:
                return { x: 0, y: Math.floor(height / 2), originX: 0, originY: 0.5, px: 1, py: 0 };
            case GridSnap.CENTER_CENTER:
                return {
                    x: Math.floor(width / 2),
                    y: Math.floor(height / 2),
                    originX: 0.5,
                    originY: 0.5,
                    px: 0,
                    py: 0
                };
            case GridSnap.CENTER_RIGHT:
                return {
                    x: width - 1,
                    y: Math.floor(height / 2),
                    originX: 1,
                    originY: 0.5,
                    px: -1,
                    py: 0
                };
            case GridSnap.BOTTOM_LEFT:
                return { x: 0, y: height - 1, originX: 0, originY: 1, px: 1, py: -1 };
            case GridSnap.BOTTOM_CENTER:
                return {
                    x: Math.floor(width / 2),
                    y: height - 1,
                    originX: 0.5,
                    originY: 1,
                    px: 0,
                    py: -1
                };
            case GridSnap.BOTTOM_RIGHT:
                return { x: width - 1, y: height - 1, originX: 1, originY: 1, px: -1, py: -1 };
            default:
                return { x: 0, y: 0, originX: 0, originY: 0, px: 0, py: 0 };
        }
    }

    addSprite(
        sprite: SnappableGameObject,
        position: SnapPosition | number,
        offsetX = 0,
        offsetY = 0
    ): void {
        if (typeof position === 'number') {
            const x = position % this.gridWidth;
            const y = Math.floor(position / this.gridWidth);
            const originX = x === 0 ? 0 : x === this.gridWidth - 1 ? 1 : 0.5;
            const originY = y === 0 ? 0 : y === this.gridHeight - 1 ? 1 : 0.5;

            this.sprites.set(sprite, { x, y, originX, originY, px: 0, py: 0, offsetX, offsetY });
        } else {
            this.sprites.set(sprite, { ...this.getIndex(position), offsetX, offsetY });
        }
    }

    removeSprite(sprite: SnappableGameObject): void {
        this.sprites.delete(sprite);
    }

    resize(): void {
        const view = this.scene.scale.getViewPort(this.scene.cameras.main);
        const width = view.width;
        const height = view.height;

        const cellWidth = width / this.gridWidth;
        const cellHeight = height / this.gridHeight;

        this.sprites.forEach((position, sprite) => {
            const x =
                view.x +
                position.px * this.paddingX +
                position.originX * cellWidth +
                Math.floor(position.x * cellWidth);
            const y =
                view.y +
                position.py * this.paddingY +
                position.originY * cellHeight +
                Math.floor(position.y * cellHeight);

            sprite.setPosition(x + position.offsetX, y + position.offsetY);
            sprite.setOrigin(position.originX, position.originY);
        });
    }
}
