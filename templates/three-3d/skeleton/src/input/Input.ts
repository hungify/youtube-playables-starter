import { INPUT } from '@core/Constants';
import { clampInput, type Point } from '@core/DriftRules';

const ALL_KEYS = new Set<string>([
    ...INPUT.KEYS_LEFT,
    ...INPUT.KEYS_RIGHT,
    ...INPUT.KEYS_UP,
    ...INPUT.KEYS_DOWN
]);

/**
 * Keyboard + hold-and-drag input as a direction on the arena floor. The camera looks down -Z,
 * so screen right is +X and screen down is +Z.
 */
export class Input {
    private readonly pressed = new Set<string>();
    private pointerId: number | null = null;
    private pointerX = 0;
    private pointerY = 0;

    constructor(private readonly canvas: HTMLCanvasElement) {
        canvas.addEventListener('pointerdown', this.onPointerDown);
        canvas.addEventListener('pointermove', this.onPointerMove);
        canvas.addEventListener('pointerup', this.onPointerUp);
        canvas.addEventListener('pointercancel', this.onPointerUp);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        window.addEventListener('blur', this.release);
    }

    /** Writes the current direction (length <= 1) into `out`. */
    read(out: Point): Point {
        let x = this.axis(INPUT.KEYS_RIGHT) - this.axis(INPUT.KEYS_LEFT);
        let z = this.axis(INPUT.KEYS_DOWN) - this.axis(INPUT.KEYS_UP);

        if (this.pointerId !== null) {
            const rect = this.canvas.getBoundingClientRect();
            const dx = this.pointerX - (rect.left + rect.width / 2);
            const dy = this.pointerY - (rect.top + rect.height / 2);
            const distance = Math.hypot(dx, dy);
            if (distance > INPUT.DEADZONE_PX) {
                const tilt = Math.min(distance / INPUT.FULL_TILT_PX, 1) / distance;
                x += dx * tilt;
                z += dy * tilt;
            }
        }

        return clampInput(out, x, z);
    }

    /** Drops held keys and pointers, e.g. when the game pauses mid-drag. */
    readonly release = (): void => {
        this.pressed.clear();
        this.pointerId = null;
    };

    private axis(keys: readonly string[]): number {
        for (const key of keys) {
            if (this.pressed.has(key)) return 1;
        }
        return 0;
    }

    private readonly onPointerDown = (event: PointerEvent): void => {
        this.pointerId = event.pointerId;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
        this.canvas.setPointerCapture(event.pointerId);
    };

    private readonly onPointerMove = (event: PointerEvent): void => {
        if (event.pointerId !== this.pointerId) return;
        this.pointerX = event.clientX;
        this.pointerY = event.clientY;
    };

    private readonly onPointerUp = (event: PointerEvent): void => {
        if (event.pointerId === this.pointerId) this.pointerId = null;
    };

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (!ALL_KEYS.has(event.code)) return;
        event.preventDefault();
        this.pressed.add(event.code);
    };

    private readonly onKeyUp = (event: KeyboardEvent): void => {
        this.pressed.delete(event.code);
    };
}
