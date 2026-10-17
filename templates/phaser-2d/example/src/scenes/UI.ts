import Phaser from 'phaser';
import {
    ARENA,
    ASSET_KEYS,
    HAPTICS,
    LAYOUT,
    SCENE_KEYS,
    TEXT,
    UI_STYLE,
    VISUALS
} from '@core/Constants';
import { EventBus, Events } from '@core/EventBus';
import { gameState } from '@core/GameState';
import { YouTubePlayables } from '@sdk/YouTubePlayables';
import { GridSnap } from '@ui/GridSnap';
import { hapticsSupported, vibrate } from '@lib/Haptics';
import { minTouchSize } from '@ui/Touch';

export class UI extends Phaser.Scene {
    gridSnap!: GridSnap;
    audioIcon!: Phaser.GameObjects.Image;
    hapticsIcon!: Phaser.GameObjects.Image;
    scoreText!: Phaser.GameObjects.Text;
    waveText!: Phaser.GameObjects.Text;
    comboText!: Phaser.GameObjects.Text;
    healthBg!: Phaser.GameObjects.Rectangle;
    healthFill!: Phaser.GameObjects.Rectangle;
    nitroBg!: Phaser.GameObjects.Rectangle;
    nitroFill!: Phaser.GameObjects.Rectangle;
    radarGfx!: Phaser.GameObjects.Graphics;
    radarX = 0;
    radarY = 0;
    radarFrame = 0;
    lastNitroRatio = -1;
    hud: Phaser.GameObjects.Components.Visible[] = [];
    private unsubscribers: Array<() => void> = [];

    constructor() {
        super(SCENE_KEYS.UI);
    }

    init(): void {
        this.gridSnap = new GridSnap(this);
        this.gridSnap.setPadding(LAYOUT.HUD_PADDING, LAYOUT.HUD_PADDING);
        this.scene.bringToTop();
    }

    create(): void {
        const textStyle = {
            fontFamily: UI_STYLE.FONT_FAMILY,
            color: UI_STYLE.COLOR_WHITE,
            stroke: UI_STYLE.COLOR_BLACK,
            strokeThickness: UI_STYLE.HUD_STROKE_THICKNESS
        } as const;

        this.audioIcon = this.add.image(0, 0, ASSET_KEYS.AUDIO_OFF);
        this.hapticsIcon = this.add
            .image(0, 0, gameState.hapticsEnabled ? ASSET_KEYS.HAPTICS_ON : ASSET_KEYS.HAPTICS_OFF)
            .setVisible(hapticsSupported());
        this.makeTouchable(this.hapticsIcon, () => {
            gameState.setHaptics(!gameState.hapticsEnabled);
            if (gameState.hapticsEnabled) vibrate(HAPTICS.TOGGLE_ON);
        });
        this.scoreText = this.add.text(0, 0, '0', {
            ...textStyle,
            fontSize: UI_STYLE.HUD_SCORE_SIZE
        });
        this.waveText = this.add.text(0, 0, '', {
            ...textStyle,
            fontSize: UI_STYLE.HUD_WAVE_SIZE
        });
        this.comboText = this.add.text(0, 0, '', {
            ...textStyle,
            color: UI_STYLE.COLOR_ACCENT,
            fontSize: UI_STYLE.HUD_COMBO_SIZE
        });
        this.healthBg = this.add.rectangle(
            0,
            0,
            UI_STYLE.HEALTH_BAR_WIDTH,
            UI_STYLE.HEALTH_BAR_HEIGHT,
            UI_STYLE.HEALTH_BAR_BG,
            UI_STYLE.HEALTH_BAR_BG_ALPHA
        );
        this.healthFill = this.add
            .rectangle(
                0,
                0,
                UI_STYLE.HEALTH_BAR_WIDTH,
                UI_STYLE.HEALTH_BAR_HEIGHT,
                UI_STYLE.HEALTH_COLOR
            )
            .setOrigin(0, 0);
        this.nitroBg = this.add.rectangle(
            0,
            0,
            UI_STYLE.NITRO_BAR_WIDTH,
            UI_STYLE.NITRO_BAR_HEIGHT,
            UI_STYLE.NITRO_BAR_BG,
            UI_STYLE.NITRO_BAR_BG_ALPHA
        );
        this.nitroFill = this.add
            .rectangle(0, 0, 0, UI_STYLE.NITRO_BAR_HEIGHT, UI_STYLE.NITRO_FILL_COLOR)
            .setOrigin(0, 1);

        this.gridSnap.addSprite(this.audioIcon, GridSnap.TOP_RIGHT, LAYOUT.HUD_AUDIO_OFFSET_X);
        this.gridSnap.addSprite(
            this.hapticsIcon,
            GridSnap.TOP_RIGHT,
            LAYOUT.HUD_AUDIO_OFFSET_X - VISUALS.ICON_W - VISUALS.ICON_GAP
        );
        this.gridSnap.addSprite(this.scoreText, GridSnap.TOP_CENTER, 0, LAYOUT.HUD_SCORE_OFFSET_Y);
        this.gridSnap.addSprite(this.waveText, GridSnap.TOP_CENTER, 0, UI_STYLE.HUD_WAVE_OFFSET);
        this.gridSnap.addSprite(this.comboText, GridSnap.TOP_CENTER, 0, UI_STYLE.HUD_COMBO_OFFSET);
        this.gridSnap.addSprite(this.healthBg, GridSnap.TOP_LEFT, 0, LAYOUT.HUD_HEALTH_OFFSET_Y);
        this.gridSnap.addSprite(this.nitroBg, GridSnap.BOTTOM_CENTER, 0, LAYOUT.HUD_NITRO_OFFSET_Y);
        this.radarGfx = this.add.graphics();
        this.layoutRadar();
        this.scale.on('resize', this.layoutRadar, this);
        this.gridSnap.resize();

        this.hud = [
            this.scoreText,
            this.waveText,
            this.comboText,
            this.healthBg,
            this.healthFill,
            this.nitroBg,
            this.nitroFill,
            this.radarGfx
        ];
        this.setHudVisible(false);

        if (YouTubePlayables.isAudioEnabled()) {
            this.enableAudio();
        } else {
            this.disableAudio();
        }

        YouTubePlayables.setAudioChangeCallback((enabled: boolean) => {
            if (enabled) {
                this.enableAudio();
            } else {
                this.disableAudio();
            }
        });

        this.unsubscribers.push(
            EventBus.on(Events.SCORE_CHANGED, ({ score }) => {
                this.scoreText.setText(String(score));
            }),
            EventBus.on(Events.HEALTH_CHANGED, ({ health, max }) => {
                const ratio = Phaser.Math.Clamp(health / max, 0, 1);
                this.healthFill
                    .setSize(UI_STYLE.HEALTH_BAR_WIDTH * ratio, UI_STYLE.HEALTH_BAR_HEIGHT)
                    .setFillStyle(
                        ratio <= UI_STYLE.HEALTH_LOW_RATIO
                            ? UI_STYLE.HEALTH_LOW_COLOR
                            : UI_STYLE.HEALTH_COLOR
                    );
            }),
            EventBus.on(Events.WAVE_CHANGED, ({ wave, remaining }) => {
                this.waveText.setText(
                    wave > 0 ? `${TEXT.WAVE} ${wave}  -  ${remaining} ${TEXT.LEFT}` : ''
                );
            }),
            EventBus.on(Events.HAPTICS_CHANGED, ({ enabled }) => {
                this.hapticsIcon.setTexture(
                    enabled ? ASSET_KEYS.HAPTICS_ON : ASSET_KEYS.HAPTICS_OFF
                );
            }),
            EventBus.on(Events.SPECTACLE_HIT, ({ kind }) => this.buzz(kind)),
            EventBus.on(Events.GAME_START, () => this.setHudVisible(true)),
            EventBus.on(Events.GAME_OVER, () => {
                this.setHudVisible(false);
                this.buzz('death');
            })
        );

        this.events.once('shutdown', () => {
            this.scale.off('resize', this.layoutRadar, this);
            this.gridSnap.destroy();
            for (const unsub of this.unsubscribers) {
                unsub();
            }
            this.unsubscribers = [];
            YouTubePlayables.unsetAudioChangeCallback();
        });
    }

    /** Gives an icon a touch target of at least 48dp, however small the sprite is. */
    makeTouchable(icon: Phaser.GameObjects.Image, onTap: () => void): void {
        const padX = Math.max(0, (minTouchSize(this) - icon.width) / 2);
        const padY = Math.max(0, (minTouchSize(this) - icon.height) / 2);
        icon.setInteractive(
            new Phaser.Geom.Rectangle(-padX, -padY, icon.width + padX * 2, icon.height + padY * 2),
            Phaser.Geom.Rectangle.Contains
        );
        icon.on('pointerdown', onTap);
    }

    buzz(kind: 'smash' | 'boss' | 'barrel' | 'pickup' | 'crash' | 'wave' | 'death'): void {
        if (!gameState.hapticsEnabled || gameState.paused) return;

        switch (kind) {
            case 'smash':
                vibrate(HAPTICS.SMASH);
                break;
            case 'boss':
                vibrate(HAPTICS.BOSS);
                break;
            case 'barrel':
                vibrate(HAPTICS.BARREL);
                break;
            case 'pickup':
                vibrate(HAPTICS.PICKUP);
                break;
            case 'crash':
                vibrate(HAPTICS.CRASH);
                break;
            case 'death':
                vibrate(HAPTICS.DEATH);
                break;
            case 'wave':
                break;
        }
    }

    layoutRadar(): void {
        const view = this.scale.getViewPort(this.cameras.main);
        this.radarX = view.right - UI_STYLE.RADAR_SIZE - UI_STYLE.RADAR_MARGIN;
        this.radarY = view.bottom - UI_STYLE.RADAR_SIZE - UI_STYLE.RADAR_MARGIN;
    }

    drawRadar(): void {
        const g = this.radarGfx;
        const size = UI_STYLE.RADAR_SIZE;
        const toX = (x: number): number => this.radarX + (x / ARENA.WORLD_W) * size;
        const toY = (y: number): number => this.radarY + (y / ARENA.WORLD_H) * size;

        g.clear();
        g.fillStyle(UI_STYLE.RADAR_BG, UI_STYLE.RADAR_BG_ALPHA);
        g.fillRect(this.radarX, this.radarY, size, size);
        g.lineStyle(UI_STYLE.RADAR_BORDER_WIDTH, UI_STYLE.RADAR_BORDER);
        g.strokeRect(this.radarX, this.radarY, size, size);

        g.fillStyle(UI_STYLE.RADAR_PICKUP_COLOR);
        for (let i = 0; i < gameState.pickupCount; i++) {
            const x = gameState.pickupRadar[i * 2] ?? 0;
            const y = gameState.pickupRadar[i * 2 + 1] ?? 0;
            g.fillCircle(toX(x), toY(y), UI_STYLE.RADAR_DOT);
        }

        for (let i = 0; i < gameState.radarCount; i++) {
            const base = i * ARENA.RADAR_STRIDE;
            const boss = gameState.radar[base + 2] === 1;
            g.fillStyle(boss ? UI_STYLE.RADAR_BOSS_COLOR : UI_STYLE.RADAR_ZOMBIE_COLOR);
            g.fillCircle(
                toX(gameState.radar[base] ?? 0),
                toY(gameState.radar[base + 1] ?? 0),
                boss ? UI_STYLE.RADAR_BOSS_DOT : UI_STYLE.RADAR_DOT
            );
        }

        g.fillStyle(UI_STYLE.RADAR_PLAYER_COLOR);
        g.fillCircle(toX(gameState.playerX), toY(gameState.playerY), UI_STYLE.RADAR_DOT + 1);
    }

    setHudVisible(visible: boolean): void {
        for (const item of this.hud) {
            item.setVisible(visible);
        }
    }

    override update(): void {
        if (!gameState.started) return;

        this.healthFill.setPosition(this.healthBg.x, this.healthBg.y);
        this.radarFrame += 1;
        if (this.radarFrame % UI_STYLE.RADAR_EVERY_FRAMES === 0) this.drawRadar();
        this.comboText.setText(gameState.combo > 1 ? `${TEXT.COMBO} x${gameState.combo}` : '');

        const ratio = Phaser.Math.Clamp(gameState.nitroMs / gameState.stats.nitroMs, 0, 1);
        if (ratio !== this.lastNitroRatio) {
            this.lastNitroRatio = ratio;
            this.nitroFill
                .setPosition(this.nitroBg.x - UI_STYLE.NITRO_BAR_WIDTH / 2, this.nitroBg.y)
                .setSize(UI_STYLE.NITRO_BAR_WIDTH * ratio, UI_STYLE.NITRO_BAR_HEIGHT);
        }
    }

    enableAudio(): void {
        this.sound.setMute(false);
        this.audioIcon.setTexture(ASSET_KEYS.AUDIO_ON);
    }

    disableAudio(): void {
        this.sound.setMute(true);
        this.audioIcon.setTexture(ASSET_KEYS.AUDIO_OFF);
    }
}
