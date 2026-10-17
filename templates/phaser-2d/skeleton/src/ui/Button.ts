import type Phaser from 'phaser';
import { COLORS, LAYOUT } from '@core/Constants';

/**
 * A call-to-action button. Enter and Space trigger it too, so the game is fully playable from a
 * keyboard; the key listeners are removed when the scene shuts down.
 */
export function addButton(
    scene: Phaser.Scene,
    y: number,
    label: string,
    onPress: () => void
): Phaser.GameObjects.Container {
    let pressed = false;
    const press = (): void => {
        if (pressed) return;
        pressed = true;
        onPress();
    };

    const background = scene.add
        .rectangle(0, 0, LAYOUT.BUTTON_WIDTH, LAYOUT.BUTTON_HEIGHT, COLORS.BUTTON)
        .setInteractive({ useHandCursor: true })
        .on('pointerup', press);
    const text = scene.add
        .text(0, 0, label, {
            fontFamily: LAYOUT.FONT,
            fontSize: LAYOUT.BODY_SIZE,
            color: COLORS.BUTTON_TEXT
        })
        .setOrigin(0.5);

    const keyboard = scene.input.keyboard;
    keyboard?.on('keydown-ENTER', press);
    keyboard?.on('keydown-SPACE', press);
    scene.events.once('shutdown', () => {
        keyboard?.off('keydown-ENTER', press);
        keyboard?.off('keydown-SPACE', press);
    });

    return scene.add.container(0, y, [background, text]);
}

export function addLabel(
    scene: Phaser.Scene,
    y: number,
    text: string,
    size: number,
    color: string = COLORS.TEXT
): Phaser.GameObjects.Text {
    return scene.add
        .text(0, y, text, { fontFamily: LAYOUT.FONT, fontSize: size, color, align: 'center' })
        .setOrigin(0.5);
}
