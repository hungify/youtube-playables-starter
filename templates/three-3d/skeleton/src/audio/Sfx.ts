import { AUDIO } from '@core/Constants';
import { YouTubePlayables } from '@sdk/YouTubePlayables';

/**
 * Tiny Web Audio synth. The host decides whether the game may make sound (rule #5): the mute
 * state starts from `isAudioEnabled()` and follows `setAudioChangeCallback()`.
 */
export class Sfx {
    private context: AudioContext | null = null;
    private hostEnabled = YouTubePlayables.isAudioEnabled();
    private paused = false;

    constructor() {
        YouTubePlayables.setAudioChangeCallback((enabled) => {
            this.hostEnabled = enabled;
            this.sync();
        });
    }

    /** Browsers only start audio from a user gesture, so call this from the Play button. */
    unlock(): void {
        if (!this.context) this.context = new AudioContext();
        this.sync();
    }

    setPaused(paused: boolean): void {
        this.paused = paused;
        this.sync();
    }

    isEnabled(): boolean {
        return this.hostEnabled;
    }

    pickup(): void {
        this.sweep(AUDIO.PICKUP_FROM_HZ, AUDIO.PICKUP_TO_HZ, AUDIO.PICKUP_MS, 'triangle');
    }

    gameOver(): void {
        this.sweep(AUDIO.GAME_OVER_FROM_HZ, AUDIO.GAME_OVER_TO_HZ, AUDIO.GAME_OVER_MS, 'sawtooth');
    }

    private sync(): void {
        if (!this.context) return;
        if (this.hostEnabled && !this.paused) void this.context.resume();
        else void this.context.suspend();
    }

    private sweep(fromHz: number, toHz: number, ms: number, type: OscillatorType): void {
        const ctx = this.context;
        if (!ctx || !this.hostEnabled || this.paused) return;

        const start = ctx.currentTime;
        const end = start + ms / 1000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(fromHz, start);
        osc.frequency.exponentialRampToValueAtTime(toHz, end);
        gain.gain.setValueAtTime(AUDIO.VOLUME, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(end);
    }
}
