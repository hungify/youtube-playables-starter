import { Scene } from 'phaser';
import {
    ARENA,
    ASSET_KEYS,
    LAYOUT,
    SCENE_KEYS,
    TEXT,
    UI_STYLE,
    VISUALS,
    ZOMBIE_KEYS
} from '@core/Constants';
import { EventBus, Events } from '@core/EventBus';
import { gameState } from '@core/GameState';
import { YouTubePlayables } from '@sdk/YouTubePlayables';
import { designFrame } from '@ui/Layout';

export class MainMenu extends Scene {
    constructor() {
        super(SCENE_KEYS.MAIN_MENU);
    }

    create(): void {
        this.build();

        const onResize = (): void => this.build();
        const onPointerDown = (): void => {
            this.scene.start(SCENE_KEYS.GAME);
        };
        this.scale.on('resize', onResize);
        this.input.once('pointerdown', onPointerDown);
        this.events.once('shutdown', () => {
            this.scale.off('resize', onResize);
            this.input.off('pointerdown', onPointerDown);
        });

        YouTubePlayables.gameReady();
        EventBus.emit(Events.SPECTACLE_ENTRANCE, { scene: SCENE_KEYS.MAIN_MENU });
    }

    /** Builds the whole screen from the current size; also used to re-layout after a resize. */
    build(): void {
        this.children.removeAll(true);
        this.tweens.killAll();

        const { width, height } = this.scale.gameSize;
        const frame = designFrame(this);

        this.add
            .tileSprite(0, 0, width, height, ASSET_KEYS.GROUND)
            .setOrigin(0, 0)
            .setDepth(VISUALS.DEPTH_GROUND);

        const style = {
            fontFamily: UI_STYLE.FONT_FAMILY,
            color: UI_STYLE.COLOR_WHITE,
            stroke: UI_STYLE.COLOR_BLACK,
            strokeThickness: UI_STYLE.STROKE_THICKNESS,
            align: 'center'
        } as const;

        this.add
            .text(frame.centerX, frame.top + LAYOUT.MENU_TITLE_Y, TEXT.TITLE, {
                ...style,
                fontSize: UI_STYLE.TITLE_SIZE,
                color: UI_STYLE.COLOR_GOOD
            })
            .setOrigin(0.5)
            .setDepth(VISUALS.DEPTH_FX);

        this.add
            .text(
                frame.centerX,
                frame.top + LAYOUT.MENU_BEST_Y,
                `${TEXT.BEST} ${gameState.bestScore}`,
                { ...style, fontSize: UI_STYLE.BODY_SIZE }
            )
            .setOrigin(0.5)
            .setDepth(VISUALS.DEPTH_FX);

        const carY = frame.centerY + LAYOUT.MENU_CAR_Y;
        const car = this.add
            .image(frame.centerX, carY, gameState.activeCar)
            .setScale(ARENA.CAR_SCALE * LAYOUT.MENU_CAR_SCALE_MULT)
            .setDepth(VISUALS.DEPTH_CAR);
        this.tweens.add({
            targets: car,
            y: carY - VISUALS.MENU_CAR_BOB_PX,
            duration: VISUALS.MENU_CAR_BOB_MS,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        for (let i = 0; i < VISUALS.MENU_ZOMBIES; i++) {
            const angle = (i / VISUALS.MENU_ZOMBIES) * Phaser.Math.PI2 + VISUALS.MENU_ZOMBIE_PHASE;
            const key = ZOMBIE_KEYS[i % ZOMBIE_KEYS.length] ?? ASSET_KEYS.ZOMBIE_A;
            const zombie = this.add
                .image(
                    frame.centerX + Math.cos(angle) * VISUALS.MENU_ZOMBIE_RING,
                    carY + Math.sin(angle) * VISUALS.MENU_ZOMBIE_RING,
                    key
                )
                .setRotation(angle + ARENA.SPRITE_ROTATION_OFFSET + Math.PI)
                .setDepth(VISUALS.DEPTH_ZOMBIE);
            this.tweens.add({
                targets: zombie,
                angle: zombie.angle + VISUALS.ZOMBIE_WOBBLE_DEG,
                duration: VISUALS.ZOMBIE_WOBBLE_MS,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        const prompt = this.add
            .text(frame.centerX, frame.bottom - LAYOUT.MENU_PROMPT_FROM_BOTTOM, TEXT.TAP_TO_START, {
                ...style,
                fontSize: UI_STYLE.HEADING_SIZE
            })
            .setOrigin(0.5)
            .setDepth(VISUALS.DEPTH_FX);
        this.tweens.add({
            targets: prompt,
            alpha: VISUALS.BLINK_ALPHA,
            duration: VISUALS.MENU_CAR_BOB_MS,
            yoyo: true,
            repeat: -1
        });
    }
}
