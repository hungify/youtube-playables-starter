/** Shape of the cloud save. Pure data, so `core` never depends on the SDK wrapper. */
export interface GameSaveData {
    bestScore?: number;
    [key: string]: unknown;
}
