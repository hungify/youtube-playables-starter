import { describe, expect, test } from 'bun:test';
import { TypedEventBus } from '@lib/TypedEventBus';

interface Payloads {
    'score:changed': { readonly score: number };
    'game:over': Record<string, never>;
}

describe('TypedEventBus', () => {
    test('delivers payloads only to listeners of that event', () => {
        const bus = new TypedEventBus<Payloads>();
        const scores: number[] = [];
        let overs = 0;
        bus.on('score:changed', ({ score }) => scores.push(score));
        bus.on('game:over', () => overs++);

        bus.emit('score:changed', { score: 5 });
        bus.emit('score:changed', { score: 7 });

        expect(scores).toEqual([5, 7]);
        expect(overs).toBe(0);
    });

    test('the unsubscribe handle and clear() remove listeners', () => {
        const bus = new TypedEventBus<Payloads>();
        let calls = 0;
        const off = bus.on('game:over', () => calls++);
        bus.emit('game:over', {});
        off();
        bus.emit('game:over', {});
        expect(calls).toBe(1);

        bus.on('game:over', () => calls++);
        bus.clear();
        bus.emit('game:over', {});
        expect(calls).toBe(1);
    });
});
