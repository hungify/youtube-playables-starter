/** Thin wrapper over the Vibration API. iOS WebViews do not implement it, so everything is guarded. */
export function hapticsSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function vibrate(pattern: readonly number[]): void {
    if (!hapticsSupported()) return;
    navigator.vibrate([...pattern]);
}
