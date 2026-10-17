import { TypedEventBus } from '@lib/TypedEventBus';

export const Events = Object.freeze({
    SCORE_CHANGED: 'score:changed',
    COIN_COLLECTED: 'coin:collected',
    GAME_START: 'game:start',
    GAME_OVER: 'game:over'
} as const);

export type EventName = (typeof Events)[keyof typeof Events];

export interface EventPayloads {
    [Events.SCORE_CHANGED]: {
        readonly score: number;
        readonly delta: number;
        readonly bestScore: number;
    };
    [Events.COIN_COLLECTED]: {
        readonly points: number;
        readonly combo: number;
        readonly x: number;
        readonly y: number;
    };
    [Events.GAME_START]: Record<string, never>;
    [Events.GAME_OVER]: {
        readonly score: number;
        readonly bestScore: number;
        readonly newBest: boolean;
    };
}

export const EventBus = new TypedEventBus<EventPayloads>();
