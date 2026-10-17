import { TypedEventBus } from '@lib/TypedEventBus';
import type { ScreenName } from './Constants';

export const Events = Object.freeze({
    SCREEN_CHANGED: 'screen:changed',
    SCORE_CHANGED: 'score:changed',
    GEM_COLLECTED: 'gem:collected',
    GAME_START: 'game:start',
    GAME_OVER: 'game:over'
} as const);

export type EventName = (typeof Events)[keyof typeof Events];

export interface EventPayloads {
    [Events.SCREEN_CHANGED]: { readonly screen: ScreenName };
    [Events.SCORE_CHANGED]: {
        readonly score: number;
        readonly delta: number;
        readonly bestScore: number;
    };
    [Events.GEM_COLLECTED]: {
        readonly points: number;
        readonly combo: number;
        readonly x: number;
        readonly z: number;
    };
    [Events.GAME_START]: Record<string, never>;
    [Events.GAME_OVER]: {
        readonly score: number;
        readonly bestScore: number;
        readonly newBest: boolean;
    };
}

export const EventBus = new TypedEventBus<EventPayloads>();
