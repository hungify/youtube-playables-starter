import Phaser, { Scene } from 'phaser';
import {
    ARENA,
    AUDIO_KEYS,
    COIN,
    COLORS,
    GAME_CONFIG,
    INPUT,
    LAYOUT,
    PLAYER,
    SCENE_KEYS,
    TEXT
} from '@core/Constants';
import { clampInput } from '@core/CollectRules';
import { EventBus, Events } from '@core/EventBus';
import { gameState } from '@core/GameState';
import { centerCamera } from '@ui/centerCamera';

const held = (...keys: Array<Phaser.Input.Keyboard.Key | undefined>): number =>
    keys.some((key) => key?.isDown) ? 1 : 0;

interface MoveKeys {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
}

export class Game extends Scene {
    private player!: Phaser.GameObjects.Arc;
    private coin!: Phaser.GameObjects.Arc;
    private scoreText!: Phaser.GameObjects.Text;
    private timerText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private cursors: Phaser.Types.Input.Keyboard.CursorKeys | undefined;
    private wasd: MoveKeys | undefined;
    private readonly direction = { x: 0, y: 0 };
    private shownSeconds = -1;

    constructor() {
        super(SCENE_KEYS.GAME);
    }

    create(): void {
        this.cameras.main.setBackgroundColor(COLORS.BACKGROUND);
        centerCamera(this);

        this.add
            .circle(0, 0, ARENA.RADIUS, COLORS.ARENA)
            .setStrokeStyle(ARENA.BORDER, COLORS.BORDER);
        this.coin = this.add.circle(0, 0, COIN.RADIUS, COLORS.COIN);
        this.player = this.add.circle(0, 0, PLAYER.RADIUS, COLORS.PLAYER);
        this.tweens.add({
            targets: this.coin,
            scale: COIN.PULSE_SCALE,
            duration: COIN.PULSE_MS,
            yoyo: true,
            repeat: -1
        });

        const top = -GAME_CONFIG.HEIGHT / 2 + LAYOUT.HUD_MARGIN;
        const side = GAME_CONFIG.WIDTH / 2 - LAYOUT.HUD_MARGIN;
        const hudStyle = { fontFamily: LAYOUT.FONT, fontSize: LAYOUT.HUD_SIZE, color: COLORS.TEXT };
        this.scoreText = this.add.text(-side, top, '', hudStyle);
        this.timerText = this.add.text(side, top, '', hudStyle).setOrigin(1, 0);
        this.comboText = this.add
            .text(0, top, '', { ...hudStyle, color: COLORS.COMBO })
            .setOrigin(0.5, 0);

        this.cursors = this.input.keyboard?.createCursorKeys();
        this.wasd = this.input.keyboard?.addKeys(INPUT.WASD) as MoveKeys | undefined;

        const unsubscribers = [
            EventBus.on(Events.SCORE_CHANGED, ({ score }) => {
                this.scoreText.setText(`${TEXT.SCORE} ${score}`);
            }),
            EventBus.on(Events.COIN_COLLECTED, ({ combo }) => {
                this.sound.play(AUDIO_KEYS.PICKUP);
                this.comboText.setText(combo > 1 ? `${TEXT.COMBO_PREFIX}${combo}` : '');
            }),
            EventBus.on(Events.GAME_OVER, () => {
                this.sound.play(AUDIO_KEYS.GAME_OVER);
                this.scene.start(SCENE_KEYS.GAME_OVER);
            })
        ];
        this.events.once('shutdown', () => {
            for (const off of unsubscribers) off();
        });

        this.shownSeconds = -1;
        gameState.startRun(Math.random);
    }

    override update(_time: number, delta: number): void {
        this.readInput();
        gameState.tick(
            Math.min(delta, GAME_CONFIG.MAX_FRAME_MS),
            this.direction.x,
            this.direction.y,
            Math.random
        );
        if (!this.scene.isActive()) return;

        this.player.setPosition(gameState.player.x, gameState.player.y);
        this.coin.setPosition(gameState.coin.x, gameState.coin.y);

        const seconds = Math.ceil(gameState.timeLeftMs / 1000);
        if (seconds !== this.shownSeconds) {
            this.shownSeconds = seconds;
            this.timerText.setText(`${seconds}${TEXT.SECONDS_SUFFIX}`);
        }
    }

    /** Keys and hold-and-drag (towards the pointer) combine into one direction. */
    private readInput(): void {
        let x =
            held(this.cursors?.right, this.wasd?.right) - held(this.cursors?.left, this.wasd?.left);
        let y = held(this.cursors?.down, this.wasd?.down) - held(this.cursors?.up, this.wasd?.up);

        const pointer = this.input.activePointer;
        if (pointer.isDown) {
            const dx = pointer.worldX - gameState.player.x;
            const dy = pointer.worldY - gameState.player.y;
            const distance = Math.hypot(dx, dy);
            if (distance > INPUT.DEADZONE_PX) {
                const tilt = Math.min(distance / INPUT.FULL_TILT_PX, 1) / distance;
                x += dx * tilt;
                y += dy * tilt;
            }
        }

        clampInput(this.direction, x, y);
    }
}
