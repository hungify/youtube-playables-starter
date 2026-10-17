import Phaser, { Scene } from 'phaser';
import {
    ARENA,
    ASSET_KEYS,
    AUDIO_KEYS,
    GAME_CONFIG,
    INPUT_KEYS,
    REVIVE_REWARD_ID,
    SCENE_KEYS,
    TEXT,
    UI_STYLE,
    VISUALS,
    WRECK_KEYS,
    ZOMBIE_KEYS
} from '@core/Constants';
import { EventBus, Events } from '@core/EventBus';
import { gameState } from '@core/GameState';
import {
    advanceZombie,
    bossHitPoints,
    ramDamage,
    canSmash,
    circleOverlap,
    crateDrop,
    findFreeSpot,
    generateMap,
    isInsideBlast,
    isSolid,
    solidImpact,
    spawnPoint,
    stepVehicle,
    turnCommand,
    waveHasBoss,
    waveZombieCount,
    wantsThrottle,
    zombieKind,
    zombieRadius,
    zombieSpeed,
    type MapObject,
    type PickupKind,
    type ZombieKind,
    type Vehicle,
    type VehicleCommand
} from '@core/ArenaRules';
import { YouTubePlayables } from '@sdk/YouTubePlayables';
import { touchPaddingY } from '@ui/Touch';

interface MapEntity {
    readonly object: MapObject;
    readonly sprite: Phaser.GameObjects.Image;
    alive: boolean;
}

interface Zombie {
    readonly sprite: Phaser.GameObjects.Image;
    active: boolean;
    x: number;
    y: number;
    radius: number;
    hp: number;
    boss: boolean;
    kind: ZombieKind;
    speed: number;
    phase: number;
}

interface Pickup {
    readonly sprite: Phaser.GameObjects.Image;
    active: boolean;
    kind: PickupKind;
}

type WavePhase = 'delay' | 'active';

const IDLE_COMMAND: VehicleCommand = { turn: 0, throttle: false, brake: false };

export class Game extends Scene {
    vehicle: Vehicle = {
        x: ARENA.PLAYER_START_X,
        y: ARENA.PLAYER_START_Y,
        heading: ARENA.START_HEADING,
        speed: 0
    };
    player!: Phaser.GameObjects.Image;
    entities: MapEntity[] = [];
    zombies: Zombie[] = [];
    pickups: Pickup[] = [];
    popups: Phaser.GameObjects.Text[] = [];
    banner!: Phaser.GameObjects.Text;
    crashFx!: Phaser.GameObjects.Particles.ParticleEmitter;
    smashFx!: Phaser.GameObjects.Particles.ParticleEmitter;
    blastFx!: Phaser.GameObjects.Particles.ParticleEmitter;
    nitroFx!: Phaser.GameObjects.Particles.ParticleEmitter;
    engine: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | null = null;
    hint: Phaser.GameObjects.Text | null = null;
    hintTween: Phaser.Tweens.Tween | null = null;
    reviveUi: Phaser.GameObjects.GameObject[] = [];
    keys: Record<string, Phaser.Input.Keyboard.Key> = {};
    pointerWorld = new Phaser.Math.Vector2();

    phase: WavePhase = 'delay';
    phaseTimerMs: number = ARENA.WAVE_START_DELAY_MS;
    nextWave = 1;
    spawnQueue = 0;
    spawnTimerMs = 0;
    bossPending = false;
    invulnerableMs = 0;
    biteSoundMs = 0;
    nitroFxOn = false;
    ending = false;
    stuckMs = 0;
    reverseMs = 0;
    speedHintShown = false;
    aim!: Phaser.GameObjects.Arc;
    reviveEsc: (() => void) | null = null;
    reviveLayout: (() => void) | null = null;
    waveClearedByRevive = false;
    baselineDownTime = 0;
    dustFxOn = false;
    dustFx!: Phaser.GameObjects.Particles.ParticleEmitter;

    constructor() {
        super(SCENE_KEYS.GAME);
    }

    create(): void {
        this.vehicle = {
            x: ARENA.PLAYER_START_X,
            y: ARENA.PLAYER_START_Y,
            heading: ARENA.START_HEADING,
            speed: 0
        };

        this.cameras.main.setBackgroundColor(VISUALS.OUTSIDE_COLOR);
        this.updateCameraBounds();

        this.add
            .tileSprite(0, 0, ARENA.WORLD_W, ARENA.WORLD_H, ASSET_KEYS.GROUND)
            .setOrigin(0, 0)
            .setDepth(VISUALS.DEPTH_GROUND);
        this.add
            .graphics()
            .lineStyle(VISUALS.FENCE_WIDTH, VISUALS.FENCE_COLOR)
            .strokeRect(0, 0, ARENA.WORLD_W, ARENA.WORLD_H)
            .setDepth(VISUALS.DEPTH_OBJECT);

        this.buildMap();
        this.buildPools();

        this.player = this.add
            .image(this.vehicle.x, this.vehicle.y, gameState.activeCar)
            .setScale(ARENA.CAR_SCALE)
            .setDepth(VISUALS.DEPTH_CAR);
        this.cameras.main.startFollow(this.player, true, VISUALS.CAMERA_LERP, VISUALS.CAMERA_LERP);

        this.buildEffects();
        this.aim = this.add
            .circle(0, 0, VISUALS.AIM_RADIUS)
            .setStrokeStyle(VISUALS.AIM_WIDTH, VISUALS.AIM_COLOR, VISUALS.AIM_ALPHA)
            .setDepth(VISUALS.DEPTH_FX)
            .setVisible(false);

        this.banner = this.add
            .text(0, 0, '', {
                fontFamily: UI_STYLE.FONT_FAMILY,
                fontSize: VISUALS.BANNER_FONT_SIZE,
                color: UI_STYLE.COLOR_WHITE,
                stroke: UI_STYLE.COLOR_BLACK,
                strokeThickness: UI_STYLE.STROKE_THICKNESS,
                align: 'center'
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(VISUALS.DEPTH_OVERLAY)
            .setAlpha(0);
        this.positionBanner();

        this.input.addPointer(1);
        this.baselineDownTime = Math.max(
            this.input.activePointer.downTime,
            this.input.pointer1.downTime,
            this.input.pointer2.downTime
        );

        const keyboard = this.input.keyboard;
        this.keys = keyboard
            ? (keyboard.addKeys(INPUT_KEYS) as Record<string, Phaser.Input.Keyboard.Key>)
            : {};

        const onResize = (): void => {
            this.positionBanner();
            this.updateCameraBounds();
            this.hint?.setPosition(
                this.scale.gameSize.width / 2,
                this.scale.gameSize.height * VISUALS.HINT_Y_RATIO
            );
            this.reviveLayout?.();
        };
        this.scale.on('resize', onResize);

        const unsubscribeStreak = EventBus.on(Events.SPECTACLE_STREAK, ({ streak }) => {
            this.showBanner(`${TEXT.STREAK} x${streak}!`, UI_STYLE.COLOR_ACCENT);
            this.sound.play(AUDIO_KEYS.WAVE);
        });

        this.events.once('shutdown', () => {
            this.scale.off('resize', onResize);
            unsubscribeStreak();
            this.input.keyboard?.removeAllKeys(true);
            this.engine?.destroy();
            this.engine = null;
            this.entities = [];
            this.zombies = [];
            this.pickups = [];
            this.popups = [];
            this.reviveUi = [];
            this.reviveLayout = null;
            this.reviveEsc = null;
            this.hint = null;
            this.hintTween = null;
        });

        const engine = this.sound.add(AUDIO_KEYS.ENGINE, {
            loop: true,
            volume: VISUALS.ENGINE_VOLUME
        });
        if (
            engine instanceof Phaser.Sound.WebAudioSound ||
            engine instanceof Phaser.Sound.HTML5AudioSound
        ) {
            this.engine = engine;
            engine.play();
        }

        gameState.resetSession();
        this.phase = 'delay';
        this.phaseTimerMs = ARENA.WAVE_START_DELAY_MS;
        this.nextWave = 1;
        this.spawnQueue = 0;
        this.spawnTimerMs = 0;
        this.bossPending = false;
        this.invulnerableMs = 0;
        this.biteSoundMs = 0;
        this.nitroFxOn = false;
        this.ending = false;
        this.stuckMs = 0;
        this.reverseMs = 0;
        this.speedHintShown = false;
        this.dustFxOn = false;

        this.showHint();
        EventBus.emit(Events.SPECTACLE_ENTRANCE, { scene: SCENE_KEYS.GAME });
    }

    buildMap(): void {
        this.entities = generateMap(Math.random).map((object) => {
            const sprite = this.add.image(object.x, object.y, this.textureFor(object));
            sprite
                .setScale(this.scaleFor(object))
                .setRotation(object.kind === 'wreck' ? object.rotation : 0)
                .setDepth(object.kind === 'tree' ? VISUALS.DEPTH_TREE : VISUALS.DEPTH_OBJECT);
            return { object, sprite, alive: true };
        });
    }

    textureFor(object: MapObject): string {
        switch (object.kind) {
            case 'tree':
                return ASSET_KEYS.TREE;
            case 'rock':
                return ASSET_KEYS.ROCK;
            case 'crate':
                return ASSET_KEYS.CRATE;
            case 'barrel':
                return ASSET_KEYS.BARREL;
            case 'wreck':
                return (
                    WRECK_KEYS[
                        Math.floor(object.rotation * WRECK_KEYS.length) % WRECK_KEYS.length
                    ] ?? ASSET_KEYS.WRECK_A
                );
        }
    }

    scaleFor(object: MapObject): number {
        switch (object.kind) {
            case 'tree':
                return 1;
            case 'wreck':
                return ARENA.CAR_SCALE;
            case 'rock':
                return (object.radius * 2) / VISUALS.ROCK_SIZE;
            case 'crate':
                return (object.radius * 2) / VISUALS.CRATE_SIZE;
            case 'barrel':
                return (object.radius * 2) / VISUALS.BARREL_SIZE;
        }
    }

    buildPools(): void {
        this.zombies = [];
        for (let i = 0; i < ARENA.ZOMBIE_POOL_SIZE; i++) {
            const sprite = this.add
                .image(0, 0, ASSET_KEYS.ZOMBIE_A)
                .setDepth(VISUALS.DEPTH_ZOMBIE)
                .setVisible(false);
            this.zombies.push({
                sprite,
                active: false,
                x: 0,
                y: 0,
                radius: ARENA.ZOMBIE_RADIUS,
                hp: 1,
                boss: false,
                kind: 'walker',
                speed: 0,
                phase: 0
            });
        }

        this.pickups = [];
        for (let i = 0; i < ARENA.PICKUP_POOL_SIZE; i++) {
            const sprite = this.add
                .image(0, 0, ASSET_KEYS.HEAL)
                .setDepth(VISUALS.DEPTH_PICKUP)
                .setVisible(false);
            this.pickups.push({ sprite, active: false, kind: 'heal' });
        }

        this.popups = [];
        for (let i = 0; i < VISUALS.POPUP_POOL_SIZE; i++) {
            this.popups.push(
                this.add
                    .text(0, 0, '', {
                        fontFamily: UI_STYLE.FONT_FAMILY,
                        fontSize: VISUALS.POPUP_FONT_SIZE,
                        color: UI_STYLE.COLOR_WHITE,
                        stroke: UI_STYLE.COLOR_BLACK,
                        strokeThickness: UI_STYLE.STROKE_THICKNESS
                    })
                    .setOrigin(0.5)
                    .setDepth(VISUALS.DEPTH_FX)
                    .setVisible(false)
            );
        }
    }

    buildEffects(): void {
        const burst = (tints: readonly number[]): Phaser.GameObjects.Particles.ParticleEmitter =>
            this.add
                .particles(0, 0, ASSET_KEYS.SPARK, {
                    lifespan: VISUALS.PARTICLE_LIFESPAN_MS,
                    speed: { min: VISUALS.PARTICLE_SPEED_MIN, max: VISUALS.PARTICLE_SPEED_MAX },
                    angle: { min: 0, max: 360 },
                    scale: { start: VISUALS.PARTICLE_SCALE, end: 0 },
                    tint: [...tints],
                    blendMode: Phaser.BlendModes.ADD,
                    emitting: false
                })
                .setDepth(VISUALS.DEPTH_FX);

        this.crashFx = burst(VISUALS.CRASH_TINTS);
        this.smashFx = burst(VISUALS.SMASH_TINTS);
        this.blastFx = burst(VISUALS.BLAST_TINTS);

        this.dustFx = this.add
            .particles(0, 0, ASSET_KEYS.SPARK, {
                lifespan: VISUALS.DUST_LIFESPAN_MS,
                frequency: VISUALS.DUST_FREQUENCY_MS,
                speed: { min: VISUALS.DUST_SPEED_MIN, max: VISUALS.DUST_SPEED_MAX },
                angle: { min: 0, max: 360 },
                scale: { start: VISUALS.DUST_SCALE_START, end: 0 },
                alpha: { start: VISUALS.DUST_ALPHA, end: 0 },
                tint: [...VISUALS.DUST_TINTS],
                emitting: false
            })
            .setDepth(VISUALS.DEPTH_CAR - 2);

        this.nitroFx = this.add
            .particles(0, 0, ASSET_KEYS.SPARK, {
                lifespan: VISUALS.NITRO_FLAME_LIFESPAN_MS,
                frequency: VISUALS.NITRO_FLAME_FREQUENCY_MS,
                speed: { min: VISUALS.NITRO_FLAME_SPEED_MIN, max: VISUALS.NITRO_FLAME_SPEED_MAX },
                angle: { min: 0, max: 360 },
                scale: { start: VISUALS.NITRO_FLAME_SCALE, end: 0 },
                alpha: { start: VISUALS.FULL_ALPHA, end: 0 },
                tint: [...VISUALS.NITRO_FLAME_TINTS],
                blendMode: Phaser.BlendModes.ADD,
                emitting: false
            })
            .setDepth(VISUALS.DEPTH_CAR - 1);
    }

    /** On screens larger than the arena the map is centered instead of stuck to a corner. */
    updateCameraBounds(): void {
        const padX = Math.max(0, (this.scale.gameSize.width - ARENA.WORLD_W) / 2);
        const padY = Math.max(0, (this.scale.gameSize.height - ARENA.WORLD_H) / 2);
        this.cameras.main.setBounds(
            -padX,
            -padY,
            ARENA.WORLD_W + padX * 2,
            ARENA.WORLD_H + padY * 2
        );
    }

    positionBanner(): void {
        const view = this.scale.getViewPort(this.cameras.main);
        this.banner.setPosition(view.width / 2, view.height * VISUALS.BANNER_Y_RATIO);
    }

    showBanner(message: string, color: string): void {
        this.tweens.killTweensOf(this.banner);
        this.banner.setText(message).setColor(color).setAlpha(VISUALS.FULL_ALPHA);
        this.tweens.add({
            targets: this.banner,
            alpha: 0,
            delay: VISUALS.BANNER_MS / 2,
            duration: VISUALS.BANNER_MS / 2
        });
    }

    showHint(): void {
        const view = this.scale.getViewPort(this.cameras.main);
        this.hint = this.add
            .text(view.width / 2, view.height * VISUALS.HINT_Y_RATIO, TEXT.HINT, {
                fontFamily: UI_STYLE.FONT_FAMILY,
                fontSize: VISUALS.HINT_FONT_SIZE,
                color: UI_STYLE.COLOR_WHITE,
                stroke: UI_STYLE.COLOR_BLACK,
                strokeThickness: UI_STYLE.STROKE_THICKNESS,
                align: 'center'
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(VISUALS.DEPTH_OVERLAY);

        this.hintTween = this.tweens.add({
            targets: this.hint,
            alpha: 0,
            delay: VISUALS.HINT_MS,
            duration: VISUALS.POPUP_MS,
            onComplete: () => this.clearHint()
        });
    }

    clearHint(): void {
        this.hintTween?.remove();
        this.hintTween = null;
        this.hint?.destroy();
        this.hint = null;
    }

    showPopup(x: number, y: number, message: string, color: string): void {
        const popup = this.popups.find((text) => !text.visible);
        if (!popup) return;

        popup.setPosition(x, y).setText(message).setColor(color).setAlpha(VISUALS.FULL_ALPHA);
        popup.setVisible(true);
        this.tweens.add({
            targets: popup,
            y: y - VISUALS.POPUP_RISE_PX,
            alpha: 0,
            duration: VISUALS.POPUP_MS,
            onComplete: () => {
                popup.setVisible(false);
            }
        });
    }

    /**
     * The finger that steers: any pointer pressed after this scene started. A finger that is still
     * down from the Play/Retry tap is ignored until it lifts, so the car does not lurch towards it.
     */
    steeringPointer(): Phaser.Input.Pointer | null {
        for (const pointer of [
            this.input.activePointer,
            this.input.pointer1,
            this.input.pointer2
        ]) {
            if (pointer.isDown && pointer.downTime > this.baselineDownTime) return pointer;
        }
        return null;
    }

    readCommand(dtSec: number): VehicleCommand {
        const pointer = this.steeringPointer();
        if (pointer) {
            this.clearHint();
            this.cameras.main.getWorldPoint(pointer.x, pointer.y, this.pointerWorld);
            this.aim.setPosition(this.pointerWorld.x, this.pointerWorld.y).setVisible(true);
            return {
                turn: turnCommand(this.vehicle, this.pointerWorld.x, this.pointerWorld.y, dtSec),
                throttle: wantsThrottle(this.vehicle, this.pointerWorld.x, this.pointerWorld.y),
                brake: false
            };
        }

        this.aim.setVisible(false);
        const down = (name: string): boolean => this.keys[name]?.isDown === true;
        const left = down('LEFT') || down('A');
        const right = down('RIGHT') || down('D');
        const throttle = down('UP') || down('W');
        const brake = down('DOWN') || down('S');
        if (left || right || throttle || brake) {
            this.clearHint();
            return { turn: (right ? 1 : 0) - (left ? 1 : 0), throttle, brake };
        }
        return IDLE_COMMAND;
    }

    /**
     * Touch players have no reverse button, so a car that is pinned against something while
     * the throttle is held backs up for a moment and can steer free.
     */
    withUnstick(command: VehicleCommand, dtMs: number): VehicleCommand {
        if (this.reverseMs > 0) {
            this.reverseMs = Math.max(0, this.reverseMs - dtMs);
            return { turn: command.turn, throttle: false, brake: true };
        }

        if (command.throttle && this.vehicle.speed < ARENA.STUCK_SPEED) {
            this.stuckMs += dtMs;
            if (this.stuckMs > ARENA.STUCK_AFTER_MS) {
                this.stuckMs = 0;
                this.reverseMs = ARENA.STUCK_REVERSE_MS;
            }
        } else {
            this.stuckMs = 0;
        }
        return command;
    }

    /** Contextual onboarding: the first time a slow car gets bitten, explain what to do. */
    teachSpeed(): void {
        if (this.speedHintShown) return;
        this.speedHintShown = true;
        this.showBanner(TEXT.FASTER, UI_STYLE.COLOR_ACCENT);
    }

    applyDamage(amount: number, resetsCombo: boolean): void {
        if (this.invulnerableMs > 0 || this.ending) return;
        if (gameState.takeDamage(amount, resetsCombo)) {
            this.handleDeath();
        }
    }

    handleDeath(): void {
        this.ending = true;
        this.engine?.pause();
        this.nitroFx.stop();
        this.dustFx.stop();
        this.dustFxOn = false;
        this.player.setVisible(false);
        this.sound.play(AUDIO_KEYS.EXPLOSION);
        this.cameras.main.shake(VISUALS.BLAST_SHAKE_MS, VISUALS.BLAST_SHAKE_INTENSITY);
        this.blastFx.explode(VISUALS.BLAST_PARTICLES, this.vehicle.x, this.vehicle.y);

        if (gameState.canRevive() && YouTubePlayables.isLoaded()) {
            this.time.delayedCall(VISUALS.ENDING_DELAY_MS, () => this.offerRevive());
        } else {
            this.endRun();
        }
    }

    endRun(): void {
        this.time.delayedCall(VISUALS.ENDING_DELAY_MS, () => {
            gameState.finishGame();
            this.scene.start(SCENE_KEYS.GAME_OVER);
        });
    }

    offerRevive(): void {
        const makeText = (message: string, size: string, color: string): Phaser.GameObjects.Text =>
            this.add
                .text(0, 0, message, {
                    fontFamily: UI_STYLE.FONT_FAMILY,
                    fontSize: size,
                    color,
                    stroke: UI_STYLE.COLOR_BLACK,
                    strokeThickness: UI_STYLE.STROKE_THICKNESS
                })
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(VISUALS.DEPTH_OVERLAY + 1);
        const makeButton = (
            message: string,
            color: string,
            onTap: () => void
        ): Phaser.GameObjects.Text => {
            const text = makeText(message, UI_STYLE.BODY_SIZE, color)
                .setPadding(0, touchPaddingY(this, UI_STYLE.BODY_HEIGHT_PX))
                .setInteractive({ useHandCursor: true });
            text.once('pointerdown', onTap);
            return text;
        };

        const overlay = this.add
            .rectangle(0, 0, 1, 1, VISUALS.OVERLAY_COLOR, VISUALS.OVERLAY_ALPHA)
            .setScrollFactor(0)
            .setDepth(VISUALS.DEPTH_OVERLAY);
        const title = makeText(TEXT.REVIVE_TITLE, UI_STYLE.HEADING_SIZE, UI_STYLE.COLOR_WHITE);
        const watch = makeButton(TEXT.REVIVE_WATCH, UI_STYLE.COLOR_ACCENT, () => {
            this.clearReviveUi();
            // Mute while the ad plays, then restore whatever the host says the audio state is.
            this.sound.setMute(true);
            void YouTubePlayables.requestRewardedAd(REVIVE_REWARD_ID).then((rewarded) => {
                this.sound.setMute(!YouTubePlayables.isAudioEnabled());
                if (!this.scene.isActive(SCENE_KEYS.GAME)) return;
                if (rewarded && gameState.revive()) {
                    this.resumeAfterRevive();
                } else {
                    this.endRun();
                }
            });
        });
        const skip = makeButton(TEXT.REVIVE_SKIP, UI_STYLE.COLOR_MUTED, () => {
            this.clearReviveUi();
            this.endRun();
        });
        this.reviveUi.push(overlay, title, watch, skip);

        // The dialog follows the viewport, so it stays centered if the screen is resized.
        this.reviveLayout = (): void => {
            const width = this.scale.gameSize.width;
            const height = this.scale.gameSize.height;
            overlay.setPosition(width / 2, height / 2).setSize(width, height);
            title.setPosition(width / 2, height / 2 - VISUALS.REVIVE_BUTTON_GAP);
            watch.setPosition(width / 2, height / 2 + VISUALS.REVIVE_BUTTON_GAP / 2);
            skip.setPosition(width / 2, height / 2 + VISUALS.REVIVE_BUTTON_GAP * 1.5);
        };
        this.reviveLayout();

        // Playables design requirement: dialogs can be dismissed with Esc.
        this.reviveEsc = (): void => {
            this.clearReviveUi();
            this.endRun();
        };
        this.input.keyboard?.once('keydown-ESC', this.reviveEsc);
    }

    clearReviveUi(): void {
        if (this.reviveEsc) {
            this.input.keyboard?.off('keydown-ESC', this.reviveEsc);
            this.reviveEsc = null;
        }
        this.reviveLayout = null;
        for (const item of this.reviveUi) {
            item.destroy();
        }
        this.reviveUi = [];
    }

    resumeAfterRevive(): void {
        for (const zombie of this.zombies) {
            if (
                zombie.active &&
                isInsideBlast(
                    this.vehicle.x,
                    this.vehicle.y,
                    zombie.x,
                    zombie.y,
                    ARENA.REVIVE_BLAST_RADIUS
                )
            ) {
                this.removeZombie(zombie);
            }
        }
        this.waveClearedByRevive = true;
        this.blastFx.explode(VISUALS.BLAST_PARTICLES, this.vehicle.x, this.vehicle.y);
        this.vehicle = { ...this.vehicle, speed: 0 };
        this.invulnerableMs = VISUALS.INVULNERABLE_MS;
        this.player.setVisible(true);
        this.engine?.resume();
        this.ending = false;
    }

    /** Returns false when every pooled zombie is busy, so the caller can retry later. */
    spawnZombie(boss: boolean): boolean {
        const slot = this.zombies.find((zombie) => !zombie.active);
        if (!slot) return false;

        const point = spawnPoint(Math.random, this.vehicle);
        const key =
            ZOMBIE_KEYS[Math.floor(Math.random() * ZOMBIE_KEYS.length)] ?? ASSET_KEYS.ZOMBIE_A;

        const kind = zombieKind(gameState.wave, boss, Math.random);

        slot.active = true;
        slot.boss = boss;
        slot.kind = kind;
        slot.hp = boss ? bossHitPoints(gameState.wave) : 1;
        slot.radius = zombieRadius(kind);
        slot.speed = zombieSpeed(gameState.wave, kind, Math.random);
        slot.phase = Math.random() * Phaser.Math.PI2;
        slot.x = point.x;
        slot.y = point.y;
        slot.sprite
            .setTexture(key)
            .setScale(
                kind === 'boss'
                    ? ARENA.BOSS_SCALE
                    : kind === 'runner'
                      ? ARENA.RUNNER_SCALE
                      : ARENA.ZOMBIE_SCALE
            )
            .setPosition(point.x, point.y);
        if (kind === 'boss') {
            slot.sprite.setTint(VISUALS.BOSS_TINT);
        } else if (kind === 'runner') {
            slot.sprite.setTint(VISUALS.RUNNER_TINT);
        } else {
            slot.sprite.clearTint();
        }
        slot.sprite.setVisible(true);
        return true;
    }

    /** Clears a zombie without awarding points or combo (used by the revive blast). */
    removeZombie(zombie: Zombie): void {
        zombie.active = false;
        zombie.sprite.setVisible(false);
        gameState.dropZombie();
        this.smashFx.explode(VISUALS.SMASH_PARTICLES, zombie.x, zombie.y);
    }

    killZombie(zombie: Zombie): void {
        zombie.active = false;
        zombie.sprite.setVisible(false);

        const points = gameState.registerKill(zombie.kind);
        this.smashFx.explode(VISUALS.SMASH_PARTICLES, zombie.x, zombie.y);

        this.sound.play(AUDIO_KEYS.SMASH);
        this.cameras.main.shake(VISUALS.SMASH_SHAKE_MS, VISUALS.SMASH_SHAKE_INTENSITY);
        const combo = gameState.combo > 1 ? ` x${gameState.combo}` : '';
        this.showPopup(
            zombie.x,
            zombie.y - zombie.radius,
            `${TEXT.SMASH} +${points}${combo}`,
            UI_STYLE.COLOR_GOOD
        );
    }

    hurtZombie(zombie: Zombie, damage: number): void {
        zombie.hp -= damage;
        if (zombie.hp <= 0) {
            this.killZombie(zombie);
        }
    }

    dropPickup(kind: PickupKind, x: number, y: number): void {
        const slot = this.pickups.find((pickup) => !pickup.active);
        if (!slot) return;

        slot.active = true;
        slot.kind = kind;
        slot.sprite
            .setTexture(kind === 'heal' ? ASSET_KEYS.HEAL : ASSET_KEYS.NITRO)
            .setPosition(x, y)
            .setVisible(true);
    }

    explodeBarrel(entity: MapEntity): void {
        if (!entity.alive) return;
        entity.alive = false;
        entity.sprite.setVisible(false);

        const { x, y } = entity.object;
        gameState.registerBarrel();
        this.sound.play(AUDIO_KEYS.EXPLOSION);
        this.cameras.main.shake(VISUALS.BLAST_SHAKE_MS, VISUALS.BLAST_SHAKE_INTENSITY);
        this.blastFx.explode(VISUALS.BLAST_PARTICLES, x, y);
        this.showPopup(x, y - ARENA.BARREL_RADIUS, TEXT.BOOM, UI_STYLE.COLOR_ACCENT);

        for (const zombie of this.zombies) {
            if (zombie.active && isInsideBlast(x, y, zombie.x, zombie.y, ARENA.BLAST_RADIUS)) {
                this.hurtZombie(zombie, ARENA.BOSS_BASE_HP);
            }
        }

        if (isInsideBlast(x, y, this.vehicle.x, this.vehicle.y, ARENA.BLAST_CAR_RADIUS)) {
            this.vehicle = { ...this.vehicle, speed: this.vehicle.speed * ARENA.BLAST_SPEED_KEEP };
            this.applyDamage(ARENA.BLAST_CAR_DAMAGE, true);
        }

        for (const other of this.entities) {
            if (
                other.alive &&
                other.object.kind === 'barrel' &&
                isInsideBlast(x, y, other.object.x, other.object.y, ARENA.BLAST_RADIUS)
            ) {
                this.explodeBarrel(other);
            }
        }
    }

    collideWithMap(): void {
        for (const entity of this.entities) {
            if (!entity.alive || this.ending) continue;

            const { object } = entity;
            const hit = circleOverlap(
                this.vehicle.x,
                this.vehicle.y,
                ARENA.PLAYER_RADIUS,
                object.x,
                object.y,
                object.radius
            );
            if (!hit) continue;

            if (isSolid(object.kind)) {
                const impact = solidImpact(
                    this.vehicle.speed,
                    this.vehicle.heading,
                    hit.nx,
                    hit.ny
                );
                this.vehicle = {
                    ...this.vehicle,
                    x: this.vehicle.x + hit.nx * hit.depth,
                    y: this.vehicle.y + hit.ny * hit.depth,
                    speed: impact.speed
                };
                if (impact.damage > 0) {
                    this.sound.play(AUDIO_KEYS.CRASH);
                    this.cameras.main.shake(VISUALS.SHAKE_MS, VISUALS.SHAKE_INTENSITY);
                    this.crashFx.explode(VISUALS.CRASH_PARTICLES, object.x, object.y);
                    this.applyDamage(impact.damage, true);
                }
            } else if (object.kind === 'crate') {
                entity.alive = false;
                entity.sprite.setVisible(false);
                this.vehicle = {
                    ...this.vehicle,
                    speed: this.vehicle.speed * ARENA.CRATE_SPEED_KEEP
                };
                this.crashFx.explode(VISUALS.SMASH_PARTICLES, object.x, object.y);
                const drop = crateDrop(Math.random);
                if (drop) this.dropPickup(drop, object.x, object.y);
            } else {
                this.explodeBarrel(entity);
            }
        }
    }

    updateZombies(dtSec: number, timeSec: number, dtMs: number): void {
        const boosted = gameState.isBoosted();
        let biting = false;
        let biters = 0;
        let biteDamage = 0;

        for (const zombie of this.zombies) {
            if (!zombie.active) continue;

            advanceZombie(zombie, this.vehicle, zombie.speed, dtSec, timeSec, zombie.phase);

            for (const entity of this.entities) {
                if (!entity.alive) continue;
                const push = circleOverlap(
                    zombie.x,
                    zombie.y,
                    zombie.radius,
                    entity.object.x,
                    entity.object.y,
                    entity.object.radius
                );
                if (push) {
                    zombie.x += push.nx * push.depth;
                    zombie.y += push.ny * push.depth;
                }
            }

            const hit = circleOverlap(
                zombie.x,
                zombie.y,
                zombie.radius,
                this.vehicle.x,
                this.vehicle.y,
                ARENA.PLAYER_RADIUS
            );
            if (hit && !this.ending) {
                if (canSmash(this.vehicle.speed, boosted, gameState.stats.smashMinSpeed)) {
                    const damage = ramDamage(this.vehicle.speed, gameState.stats.smashMinSpeed);
                    this.vehicle = {
                        ...this.vehicle,
                        speed:
                            this.vehicle.speed *
                            (zombie.boss ? ARENA.BOSS_KNOCKBACK_SPEED_KEEP : ARENA.SMASH_SPEED_KEEP)
                    };
                    if (zombie.boss && zombie.hp > damage) {
                        zombie.x += hit.nx * zombie.radius * ARENA.BOSS_KNOCKBACK_RADII;
                        zombie.y += hit.ny * zombie.radius * ARENA.BOSS_KNOCKBACK_RADII;
                    }
                    this.hurtZombie(zombie, damage);
                } else {
                    zombie.x += hit.nx * hit.depth;
                    zombie.y += hit.ny * hit.depth;
                    biting = true;
                    this.teachSpeed();
                    if (biters < ARENA.MAX_BITERS) {
                        biters += 1;
                        biteDamage += (zombie.boss ? ARENA.BOSS_BITE_DPS : ARENA.BITE_DPS) * dtSec;
                    }
                }
            }

            if (zombie.active) {
                zombie.sprite.setPosition(zombie.x, zombie.y);
                zombie.sprite.setRotation(
                    Math.atan2(this.vehicle.y - zombie.y, this.vehicle.x - zombie.x) +
                        ARENA.SPRITE_ROTATION_OFFSET
                );
            }
        }

        // One health update per frame, however many zombies are biting.
        if (biteDamage > 0) this.applyDamage(biteDamage, false);

        this.biteSoundMs = Math.max(0, this.biteSoundMs - dtMs);
        if (biting && this.biteSoundMs === 0) {
            this.sound.play(AUDIO_KEYS.BITE);
            this.biteSoundMs = VISUALS.BITE_SOUND_INTERVAL_MS;
        }
    }

    updatePickups(): void {
        for (const pickup of this.pickups) {
            if (!pickup.active) continue;

            const hit = circleOverlap(
                this.vehicle.x,
                this.vehicle.y,
                ARENA.PLAYER_RADIUS,
                pickup.sprite.x,
                pickup.sprite.y,
                ARENA.PICKUP_RADIUS
            );
            if (!hit) continue;

            pickup.active = false;
            pickup.sprite.setVisible(false);
            gameState.collectPickup(pickup.kind);
            this.sound.play(pickup.kind === 'nitro' ? AUDIO_KEYS.NITRO : AUDIO_KEYS.PICKUP);
            this.showPopup(
                pickup.sprite.x,
                pickup.sprite.y,
                pickup.kind === 'nitro' ? TEXT.NITRO_ON : TEXT.REPAIR,
                UI_STYLE.COLOR_ACCENT
            );
        }
    }

    updateWaves(dtMs: number): void {
        if (this.phase === 'delay') {
            this.phaseTimerMs -= dtMs;
            if (this.phaseTimerMs > 0) return;

            const wave = this.nextWave;
            const count = waveZombieCount(wave);
            this.bossPending = waveHasBoss(wave);
            this.spawnQueue = count;
            this.spawnTimerMs = 0;
            gameState.startWave(wave, count);
            this.phase = 'active';
            this.sound.play(AUDIO_KEYS.WAVE);
            this.showBanner(
                this.bossPending ? TEXT.BOSS : `${TEXT.WAVE} ${wave}`,
                this.bossPending ? UI_STYLE.COLOR_DANGER : UI_STYLE.COLOR_WHITE
            );
            return;
        }

        if (this.spawnQueue > 0) {
            this.spawnTimerMs -= dtMs;
            if (this.spawnTimerMs <= 0) {
                this.spawnTimerMs = ARENA.SPAWN_STAGGER_MS;
                if (this.spawnZombie(this.bossPending)) {
                    this.bossPending = false;
                    this.spawnQueue -= 1;
                }
            }
            return;
        }

        if (gameState.remaining === 0) {
            gameState.clearWave(!this.waveClearedByRevive);
            this.waveClearedByRevive = false;
            this.sound.play(AUDIO_KEYS.WAVE);
            this.showBanner(TEXT.WAVE_CLEAR, UI_STYLE.COLOR_GOOD);

            const spot = findFreeSpot(
                Math.random,
                this.entities.filter((entity) => entity.alive).map((entity) => entity.object),
                ARENA.PICKUP_RADIUS
            );
            if (spot) {
                this.dropPickup(
                    Math.random() < ARENA.WAVE_DROP_HEAL_CHANCE ? 'heal' : 'nitro',
                    spot.x,
                    spot.y
                );
            }

            this.nextWave += 1;
            this.phase = 'delay';
            this.phaseTimerMs = ARENA.WAVE_CLEAR_DELAY_MS;
        }
    }

    updatePlayerVisual(dtMs: number): void {
        this.player
            .setPosition(this.vehicle.x, this.vehicle.y)
            .setRotation(this.vehicle.heading + ARENA.SPRITE_ROTATION_OFFSET);

        if (this.invulnerableMs > 0) {
            this.invulnerableMs = Math.max(0, this.invulnerableMs - dtMs);
            const visible = Math.floor(this.invulnerableMs / VISUALS.BLINK_MS) % 2 === 0;
            this.player.setAlpha(visible ? VISUALS.BLINK_ALPHA : VISUALS.FULL_ALPHA);
        } else {
            this.player.setAlpha(VISUALS.FULL_ALPHA);
        }

        const boosted = gameState.isBoosted();
        if (boosted !== this.nitroFxOn) {
            this.nitroFxOn = boosted;
            if (boosted) {
                this.nitroFx.start();
            } else {
                this.nitroFx.stop();
            }
        }
        if (boosted) {
            this.nitroFx.setPosition(
                this.vehicle.x - Math.cos(this.vehicle.heading) * ARENA.PLAYER_RADIUS,
                this.vehicle.y - Math.sin(this.vehicle.heading) * ARENA.PLAYER_RADIUS
            );
        }

        const dusty = this.vehicle.speed > VISUALS.DUST_SPEED;
        if (dusty !== this.dustFxOn) {
            this.dustFxOn = dusty;
            if (dusty) {
                this.dustFx.start();
            } else {
                this.dustFx.stop();
            }
        }
        if (dusty) {
            this.dustFx.setPosition(
                this.vehicle.x - Math.cos(this.vehicle.heading) * ARENA.PLAYER_RADIUS,
                this.vehicle.y - Math.sin(this.vehicle.heading) * ARENA.PLAYER_RADIUS
            );
        }

        const topSpeed = ARENA.MAX_SPEED * gameState.stats.speedMult * ARENA.BOOST_SPEED_MULT;
        this.engine?.setRate(
            Phaser.Math.Linear(
                VISUALS.ENGINE_RATE_MIN,
                VISUALS.ENGINE_RATE_MAX,
                Phaser.Math.Clamp(this.vehicle.speed / topSpeed, 0, 1)
            )
        );
    }

    /** Mirrors zombie and pickup positions into gameState for the radar and QA hooks. */
    publishRadar(): void {
        let count = 0;
        for (const zombie of this.zombies) {
            if (!zombie.active) continue;
            const base = count * ARENA.RADAR_STRIDE;
            gameState.radar[base] = zombie.x;
            gameState.radar[base + 1] = zombie.y;
            gameState.radar[base + 2] = zombie.boss ? 1 : 0;
            count += 1;
        }
        gameState.radarCount = count;

        let pickups = 0;
        for (const pickup of this.pickups) {
            if (!pickup.active) continue;
            gameState.pickupRadar[pickups * 2] = pickup.sprite.x;
            gameState.pickupRadar[pickups * 2 + 1] = pickup.sprite.y;
            pickups += 1;
        }
        gameState.pickupCount = pickups;
    }

    override update(time: number, delta: number): void {
        if (this.ending) return;

        const dtMs = Math.min(delta, GAME_CONFIG.MAX_FRAME_MS);
        const dtSec = dtMs / GAME_CONFIG.MS_PER_SECOND;
        gameState.advance(dtMs);

        const command = this.withUnstick(this.readCommand(dtSec), dtMs);
        this.vehicle = stepVehicle(
            this.vehicle,
            command,
            dtSec,
            gameState.isBoosted(),
            gameState.stats.speedMult
        );
        gameState.speed = this.vehicle.speed;
        gameState.playerX = this.vehicle.x;
        gameState.playerY = this.vehicle.y;
        this.publishRadar();

        this.collideWithMap();
        this.updateZombies(dtSec, time / GAME_CONFIG.MS_PER_SECOND, dtMs);
        if (!this.ending) {
            this.updatePickups();
            this.updateWaves(dtMs);
        }
        this.updatePlayerVisual(dtMs);
    }
}
