import { Scene } from 'phaser';
import {
    ASSET_KEYS,
    AUDIO_KEYS,
    CAR_SKINS,
    LAYOUT,
    SCENE_KEYS,
    TEXT,
    UI_STYLE,
    UPGRADES,
    VISUALS,
    type UpgradeId
} from '@core/Constants';
import { EventBus, Events } from '@core/EventBus';
import { gameState } from '@core/GameState';
import { effectLabel, upgradeCost } from '@core/Upgrades';
import { YouTubePlayables } from '@sdk/YouTubePlayables';
import { designFrame } from '@ui/Layout';
import { minTouchSize, touchGap, touchPaddingY } from '@ui/Touch';

export class GameOver extends Scene {
    selection!: Phaser.GameObjects.Rectangle;
    scrapText!: Phaser.GameObjects.Text;
    tiles = new Map<string, Phaser.GameObjects.Image>();
    cards = new Map<
        UpgradeId,
        {
            card: Phaser.GameObjects.Rectangle;
            title: Phaser.GameObjects.Text;
            detail: Phaser.GameObjects.Text;
        }
    >();
    private unsubscribers: Array<() => void> = [];

    constructor() {
        super(SCENE_KEYS.GAME_OVER);
    }

    create(): void {
        this.build();

        const onResize = (): void => this.build();
        this.scale.on('resize', onResize);
        this.unsubscribers = [EventBus.on(Events.UPGRADE_BOUGHT, () => this.refreshShop())];
        this.events.once('shutdown', () => {
            this.scale.off('resize', onResize);
            for (const unsubscribe of this.unsubscribers) {
                unsubscribe();
            }
            this.unsubscribers = [];
        });

        YouTubePlayables.sendScore(gameState.score);
        YouTubePlayables.saveData(gameState.toSaveData()).catch(console.error);
        EventBus.emit(Events.SPECTACLE_ENTRANCE, { scene: SCENE_KEYS.GAME_OVER });
    }

    /** Builds the whole screen from the current size; also used to re-layout after a resize. */
    build(): void {
        this.children.removeAll(true);
        this.tweens.killAll();
        this.tiles.clear();
        this.cards.clear();

        const { width, height } = this.scale.gameSize;
        const frame = designFrame(this);
        const cx = frame.centerX;

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
        const addText = (
            y: number,
            message: string,
            size: string,
            color: string = UI_STYLE.COLOR_WHITE
        ): Phaser.GameObjects.Text =>
            this.add
                .text(cx, y, message, { ...style, fontSize: size, color })
                .setOrigin(0.5)
                .setDepth(VISUALS.DEPTH_FX);

        addText(
            frame.top + LAYOUT.OVER_CRASHED_Y,
            TEXT.CRASHED,
            UI_STYLE.HEADING_SIZE,
            UI_STYLE.COLOR_DANGER
        );
        addText(frame.top + LAYOUT.OVER_SCORE_Y, String(gameState.score), UI_STYLE.TITLE_SIZE);
        if (gameState.isNewBest()) {
            addText(
                frame.top + LAYOUT.OVER_BEST_Y,
                TEXT.NEW_BEST,
                UI_STYLE.BODY_SIZE,
                UI_STYLE.COLOR_ACCENT
            );
        } else {
            addText(
                frame.top + LAYOUT.OVER_BEST_Y,
                `${TEXT.BEST} ${gameState.bestScore}`,
                UI_STYLE.BODY_SIZE
            );
        }
        addText(
            frame.top + LAYOUT.OVER_STATS_Y,
            `${TEXT.SMASHED} ${gameState.smashes}   ${TEXT.REACHED} ${gameState.wave}`,
            UI_STYLE.SMALL_SIZE,
            UI_STYLE.COLOR_MUTED
        );

        this.buildShop(frame.top + LAYOUT.OVER_SHOP_TOP, addText);
        this.buildGarage(frame.centerX, frame.top + LAYOUT.OVER_GARAGE_TOP, addText);

        const retry = addText(
            frame.bottom - LAYOUT.OVER_RETRY_FROM_BOTTOM,
            TEXT.RETRY,
            UI_STYLE.HEADING_SIZE,
            UI_STYLE.COLOR_ACCENT
        );
        retry
            .setPadding(0, touchPaddingY(this, UI_STYLE.HEADING_HEIGHT_PX))
            .setInteractive({ useHandCursor: true });
        retry.once('pointerdown', () => this.scene.start(SCENE_KEYS.GAME));
        this.tweens.add({
            targets: retry,
            alpha: VISUALS.BLINK_ALPHA,
            duration: VISUALS.MENU_CAR_BOB_MS,
            yoyo: true,
            repeat: -1
        });
    }

    buildShop(
        top: number,
        addText: (
            y: number,
            message: string,
            size: string,
            color?: string
        ) => Phaser.GameObjects.Text
    ): void {
        addText(top, TEXT.UPGRADES, UI_STYLE.BODY_SIZE);
        this.scrapText = addText(
            top + UI_STYLE.SHOP_SCRAP_OFFSET,
            '',
            UI_STYLE.SMALL_SIZE,
            UI_STYLE.COLOR_ACCENT
        );

        const width = UI_STYLE.SHOP_CARD_W;
        const height = Math.max(UI_STYLE.SHOP_CARD_H, minTouchSize(this));
        const gap = Math.max(UI_STYLE.SHOP_CARD_GAP, touchGap(this));
        const centerX = this.scale.gameSize.width / 2;

        UPGRADES.forEach((upgrade, index) => {
            const column = index % 2;
            const row = Math.floor(index / 2);
            const x = centerX + (column === 0 ? -1 : 1) * ((width + gap) / 2);
            const y = top + UI_STYLE.SHOP_FIRST_ROW_OFFSET + height / 2 + row * (height + gap);

            const card = this.add
                .rectangle(x, y, width, height, UI_STYLE.SHOP_CARD_COLOR, UI_STYLE.SHOP_CARD_ALPHA)
                .setStrokeStyle(UI_STYLE.SHOP_CARD_BORDER, UI_STYLE.SHOP_IDLE_BORDER)
                .setDepth(VISUALS.DEPTH_FX)
                .setInteractive({ useHandCursor: true });
            card.on('pointerdown', () => {
                if (gameState.buyUpgrade(upgrade.id)) {
                    this.sound.play(AUDIO_KEYS.PICKUP);
                    YouTubePlayables.saveData(gameState.toSaveData()).catch(console.error);
                }
            });

            const title = this.add
                .text(x, y - UI_STYLE.SHOP_LINE_GAP / 2, '', {
                    fontFamily: UI_STYLE.FONT_FAMILY,
                    fontSize: UI_STYLE.SHOP_TITLE_SIZE,
                    color: UI_STYLE.COLOR_WHITE,
                    stroke: UI_STYLE.COLOR_BLACK,
                    strokeThickness: UI_STYLE.STROKE_THICKNESS
                })
                .setOrigin(0.5)
                .setDepth(VISUALS.DEPTH_FX + 1);
            const detail = this.add
                .text(x, y + UI_STYLE.SHOP_LINE_GAP / 2, '', {
                    fontFamily: UI_STYLE.FONT_FAMILY,
                    fontSize: UI_STYLE.SHOP_LINE_SIZE,
                    color: UI_STYLE.COLOR_MUTED,
                    stroke: UI_STYLE.COLOR_BLACK,
                    strokeThickness: UI_STYLE.STROKE_THICKNESS
                })
                .setOrigin(0.5)
                .setDepth(VISUALS.DEPTH_FX + 1);
            this.cards.set(upgrade.id, { card, title, detail });
        });

        this.refreshShop();
    }

    refreshShop(): void {
        this.scrapText.setText(
            `${TEXT.SCRAP} ${gameState.scrap}   (+${gameState.scrapEarnedLastRun})`
        );

        for (const upgrade of UPGRADES) {
            const parts = this.cards.get(upgrade.id);
            if (!parts) continue;

            const level = gameState.upgrades[upgrade.id];
            const cost = upgradeCost(upgrade.id, level);
            const affordable = cost !== null && gameState.scrap >= cost;
            const color =
                cost === null
                    ? UI_STYLE.COLOR_ACCENT
                    : affordable
                      ? UI_STYLE.COLOR_GOOD
                      : UI_STYLE.COLOR_MUTED;

            parts.title.setText(`${upgrade.label}  ${TEXT.LEVEL}${level}/${upgrade.maxLevel}`);
            parts.detail
                .setText(`${effectLabel(upgrade.id, level)}  -  ${cost ?? TEXT.MAX_LEVEL}`)
                .setColor(color);
            parts.card.setStrokeStyle(
                UI_STYLE.SHOP_CARD_BORDER,
                affordable ? UI_STYLE.SHOP_AFFORDABLE_BORDER : UI_STYLE.SHOP_IDLE_BORDER
            );
        }
    }

    buildGarage(
        centerX: number,
        top: number,
        addText: (
            y: number,
            message: string,
            size: string,
            color?: string
        ) => Phaser.GameObjects.Text
    ): void {
        addText(top, TEXT.GARAGE, UI_STYLE.BODY_SIZE);

        const gap = UI_STYLE.SKIN_TILE_GAP;
        const y = top + UI_STYLE.GARAGE_CARS_OFFSET;
        const firstX = centerX - ((CAR_SKINS.length - 1) * gap) / 2;

        this.selection = this.add
            .rectangle(
                0,
                y,
                UI_STYLE.SKIN_FRAME_W,
                UI_STYLE.SKIN_FRAME_H,
                UI_STYLE.TRANSPARENT_COLOR,
                0
            )
            .setStrokeStyle(UI_STYLE.STROKE_THICKNESS, UI_STYLE.SKIN_SELECTED_COLOR)
            .setDepth(VISUALS.DEPTH_FX);

        CAR_SKINS.forEach((skin, index) => {
            const x = firstX + index * gap;
            const unlocked = gameState.isCarUnlocked(skin.id);
            const image = this.add
                .image(x, y, skin.id)
                .setScale(UI_STYLE.SKIN_TILE_SCALE)
                .setDepth(VISUALS.DEPTH_CAR);
            this.tiles.set(skin.id, image);

            if (unlocked) {
                const zone = this.add
                    .rectangle(
                        x,
                        y,
                        UI_STYLE.SKIN_FRAME_W,
                        UI_STYLE.SKIN_FRAME_H,
                        UI_STYLE.TRANSPARENT_COLOR,
                        0
                    )
                    .setInteractive({ useHandCursor: true });
                zone.on('pointerdown', () => {
                    gameState.selectCar(skin.id);
                    this.refreshSelection();
                    YouTubePlayables.saveData(gameState.toSaveData()).catch(console.error);
                });
            } else {
                image.setTint(UI_STYLE.SKIN_LOCKED_TINT);
                this.add
                    .text(
                        x,
                        y + UI_STYLE.SKIN_LABEL_OFFSET,
                        `${TEXT.UNLOCK_AT}\n${skin.unlockScore}`,
                        {
                            fontFamily: UI_STYLE.FONT_FAMILY,
                            fontSize: UI_STYLE.SMALL_SIZE,
                            color: UI_STYLE.COLOR_MUTED,
                            stroke: UI_STYLE.COLOR_BLACK,
                            strokeThickness: UI_STYLE.STROKE_THICKNESS,
                            align: 'center'
                        }
                    )
                    .setOrigin(0.5, 0)
                    .setDepth(VISUALS.DEPTH_FX);
            }
        });

        this.refreshSelection();
    }

    refreshSelection(): void {
        const active = this.tiles.get(gameState.activeCar);
        if (active) {
            this.selection.setX(active.x);
        }
    }
}
