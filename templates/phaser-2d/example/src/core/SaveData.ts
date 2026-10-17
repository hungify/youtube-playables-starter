/** Shape of the cloud save. Pure data, so `core` never depends on the SDK wrapper. */
export interface GameSaveData {
    activeCar?: string;
    bestScore?: number;
    scrap?: number;
    upgrades?: Record<string, number>;
    haptics?: boolean;
    [key: string]: unknown;
}
