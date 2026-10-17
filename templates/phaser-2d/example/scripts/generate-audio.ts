/**
 * Synthesizes every sound effect as a small mono WAV, so the game ships original audio with no
 * licensing risk. Output goes to public/assets/fx. Run with: bun scripts/generate-audio.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SAMPLE_RATE = 22050;
const PEAK = 0.85;
const FADE_S = 0.004;
const OUT_DIR = join(import.meta.dir, '..', 'public', 'assets', 'fx');

type Voice = (t: number, progress: number) => number;

let noiseState = 1;
function noise(): number {
    noiseState = (noiseState * 1664525 + 1013904223) % 4294967296;
    return (noiseState / 4294967296) * 2 - 1;
}

const TAU = Math.PI * 2;
const sine = (phase: number): number => Math.sin(TAU * phase);
const saw = (phase: number): number => 2 * (phase - Math.floor(phase + 0.5));
const square = (phase: number): number => (phase % 1 < 0.5 ? 1 : -1);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Integrates a frequency curve so sweeps stay click-free. */
function sweep(from: number, to: number, wave: (phase: number) => number): Voice {
    let phase = 0;
    return (_t, progress) => {
        phase += lerp(from, to, progress) / SAMPLE_RATE;
        return wave(phase);
    };
}

/** One-pole low-pass whose cutoff follows the curve. */
function filteredNoise(cutoff: (progress: number) => number): Voice {
    let y = 0;
    return (_t, progress) => {
        const a = 1 - Math.exp((-TAU * cutoff(progress)) / SAMPLE_RATE);
        y += a * (noise() - y);
        return y;
    };
}

function render(
    durationS: number,
    voice: Voice,
    envelope: (progress: number) => number
): Float32Array {
    const length = Math.floor(durationS * SAMPLE_RATE);
    const samples = new Float32Array(length);
    for (let i = 0; i < length; i++) {
        const progress = i / length;
        samples[i] = voice(i / SAMPLE_RATE, progress) * envelope(progress);
    }
    return samples;
}

function normalize(samples: Float32Array, fade: boolean): Float32Array {
    let max = 0;
    for (const s of samples) max = Math.max(max, Math.abs(s));
    const gain = max > 0 ? PEAK / max : 1;
    const fadeSamples = Math.floor(FADE_S * SAMPLE_RATE);
    return samples.map((s, i) => {
        let value = s * gain;
        if (fade) {
            if (i < fadeSamples) value *= i / fadeSamples;
            const fromEnd = samples.length - 1 - i;
            if (fromEnd < fadeSamples) value *= fromEnd / fadeSamples;
        }
        return value;
    });
}

function toWav(samples: Float32Array): Uint8Array {
    const dataBytes = samples.length * 2;
    const buffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buffer);
    const text = (offset: number, value: string): void => {
        for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };

    text(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, 'data');
    view.setUint32(40, dataBytes, true);

    samples.forEach((s, i) => {
        view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, s)) * 32767), true);
    });
    return new Uint8Array(buffer);
}

const sounds: Record<string, { samples: Float32Array; fade: boolean }> = {
    // Wet thump when the car plows through a zombie.
    smash: {
        fade: true,
        samples: render(
            0.32,
            (() => {
                const squelch = filteredNoise((p) => lerp(2600, 300, Math.min(1, p * 2.5)));
                const thump = sweep(190, 55, sine);
                const gurgle = sweep(120, 80, square);
                return (t, p) =>
                    squelch(t, p) * 0.8 +
                    thump(t, p) * 1.1 * Math.exp(-p * 7) +
                    gurgle(t, p) * 0.2 * Math.exp(-p * 10);
            })(),
            (p) => Math.min(1, p * 80) * Math.exp(-p * 5)
        )
    },

    // Heavy impact: crunch noise plus a low thud.
    crash: {
        fade: true,
        samples: render(
            0.7,
            (() => {
                const crunch = filteredNoise((p) => lerp(4500, 180, Math.min(1, p * 3)));
                const thud = sweep(95, 38, sine);
                return (t, p) => crunch(t, p) * 0.9 + thud(t, p) * 1.1 * Math.exp(-p * 6);
            })(),
            (p) => Math.min(1, p * 60) * Math.exp(-p * 4.5)
        )
    },

    // Short chomp when zombies bite the car.
    bite: {
        fade: true,
        samples: render(
            0.12,
            (() => {
                const click = filteredNoise((p) => lerp(3200, 700, p));
                const grunt = sweep(210, 130, saw);
                return (t, p) => click(t, p) * 0.7 + grunt(t, p) * 0.4;
            })(),
            (p) => Math.min(1, p * 30) * Math.exp(-p * 6)
        )
    },

    // Big boom for explosive barrels: long rumble under a crack.
    explosion: {
        fade: true,
        samples: render(
            1.1,
            (() => {
                const rumble = filteredNoise((p) => lerp(1800, 90, Math.min(1, p * 1.6)));
                const boom = sweep(70, 28, sine);
                const crack = filteredNoise(() => 6000);
                return (t, p) =>
                    rumble(t, p) * 0.9 +
                    boom(t, p) * 1.2 * Math.exp(-p * 3) +
                    crack(t, p) * 0.6 * Math.exp(-p * 40);
            })(),
            (p) => Math.min(1, p * 90) * Math.exp(-p * 3.2)
        )
    },

    // Two-note pickup chime.
    pickup: {
        fade: true,
        samples: render(
            0.28,
            (t) => {
                const hi = t > 0.075;
                const f = hi ? 1318.5 : 987.8;
                const local = hi ? t - 0.075 : t;
                return (
                    (sine(f * local) + 0.3 * sine(f * 2 * local)) * Math.exp(-local * (hi ? 9 : 22))
                );
            },
            () => 1
        )
    },

    // Rising turbine whine with a burst of flame noise.
    nitro: {
        fade: true,
        samples: render(
            0.75,
            (() => {
                const whine = sweep(160, 980, saw);
                const flame = filteredNoise((p) => lerp(900, 5000, p));
                return (t, p) => whine(t, p) * 0.55 + flame(t, p) * 0.5;
            })(),
            (p) => Math.min(1, p * 12) * (1 - p ** 3)
        )
    },

    // Rising arpeggio for cleared waves and rampage milestones.
    wave: {
        fade: true,
        samples: render(
            0.55,
            (t) => {
                const notes = [523.25, 659.25, 783.99, 1046.5];
                const index = Math.min(notes.length - 1, Math.floor(t / 0.095));
                const local = t - index * 0.095;
                const f = notes[index] ?? 523.25;
                return (square(f * local) * 0.4 + sine(f * local)) * Math.exp(-local * 7);
            },
            (p) => 1 - p * 0.3
        )
    },

    // Seamless 1 s engine loop: every partial is an integer number of cycles per second.
    engine: {
        fade: false,
        samples: render(
            1,
            (t) => {
                const base = 62;
                let value = 0;
                for (let k = 1; k <= 9; k++) {
                    value += sine(base * k * t + k * 0.13) / k ** 1.1;
                }
                const rumble = 1 + 0.25 * sine(8 * t);
                return value * rumble;
            },
            () => 1
        )
    }
};

mkdirSync(OUT_DIR, { recursive: true });
for (const [name, { samples, fade }] of Object.entries(sounds)) {
    const file = join(OUT_DIR, `${name}.wav`);
    writeFileSync(file, toWav(normalize(samples, fade)));
    console.log(`wrote ${file} (${(samples.length / SAMPLE_RATE).toFixed(2)}s)`);
}
