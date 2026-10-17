import { TypedEventBus } from '@lib/TypedEventBus';
import type { CarId, UpgradeId } from './Constants';

export const Events = Object.freeze({
    // Run progress domain
    SCORE_CHANGED: 'score:changed',
    HEALTH_CHANGED: 'health:changed',
    WAVE_CHANGED: 'wave:changed',

    // Garage domain
    CAR_CHANGED: 'car:changed',
    CAR_UNLOCKED: 'car:unlocked',
    HAPTICS_CHANGED: 'haptics:changed',
    UPGRADE_BOUGHT: 'upgrade:bought',

    // Game lifecycle domain
    GAME_START: 'game:start',
    GAME_OVER: 'game:over',
    GAME_RESTART: 'game:restart',

    // Spectacle hooks (from official game-creator / phaser skill)
    SPECTACLE_ENTRANCE: 'spectacle:entrance',
    SPECTACLE_HIT: 'spectacle:hit',
    SPECTACLE_COMBO: 'spectacle:combo',
    SPECTACLE_STREAK: 'spectacle:streak'
} as const);

export type EventName = (typeof Events)[keyof typeof Events];

export type HitKind = 'smash' | 'boss' | 'barrel' | 'pickup' | 'crash' | 'wave';

export interface EventPayloads {
    [Events.SCORE_CHANGED]: {
        readonly score: number;
        readonly delta: number;
        readonly bestScore: number;
    };
    [Events.HEALTH_CHANGED]: { readonly health: number; readonly max: number };
    [Events.WAVE_CHANGED]: { readonly wave: number; readonly remaining: number };
    [Events.CAR_CHANGED]: { readonly activeCar: CarId };
    [Events.CAR_UNLOCKED]: { readonly car: CarId };
    [Events.HAPTICS_CHANGED]: { readonly enabled: boolean };
    [Events.UPGRADE_BOUGHT]: {
        readonly id: UpgradeId;
        readonly level: number;
        readonly scrap: number;
    };
    [Events.GAME_START]: { readonly health: number };
    [Events.GAME_OVER]: {
        readonly score: number;
        readonly bestScore: number;
        readonly wave: number;
        readonly smashes: number;
    };
    [Events.GAME_RESTART]: Record<string, never>;
    [Events.SPECTACLE_ENTRANCE]: { readonly scene: string };
    [Events.SPECTACLE_HIT]: { readonly kind: HitKind; readonly points: number };
    [Events.SPECTACLE_COMBO]: { readonly combo: number };
    [Events.SPECTACLE_STREAK]: { readonly streak: number };
}

export const EventBus = new TypedEventBus<EventPayloads>();
