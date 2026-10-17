import { ARENA, SCRAP, UPGRADES, type UpgradeId } from './Constants';

export type UpgradeLevels = Record<UpgradeId, number>;

export interface CarStats {
    readonly maxHealth: number;
    readonly speedMult: number;
    readonly smashMinSpeed: number;
    readonly nitroMs: number;
}

export const NO_UPGRADES: Readonly<UpgradeLevels> = Object.freeze({
    armor: 0,
    engine: 0,
    ram: 0,
    nitro: 0
});

export function upgradeDef(id: UpgradeId): (typeof UPGRADES)[number] {
    const def = UPGRADES.find((upgrade) => upgrade.id === id);
    if (!def) throw new Error(`Unknown upgrade: ${id}`);
    return def;
}

export function isUpgradeId(value: unknown): value is UpgradeId {
    return UPGRADES.some((upgrade) => upgrade.id === value);
}

/** Price of the next level, or null once the upgrade is maxed out. */
export function upgradeCost(id: UpgradeId, level: number): number | null {
    const def = upgradeDef(id);
    if (level >= def.maxLevel) return null;
    return Math.round(def.baseCost * def.costGrowth ** Math.max(0, level));
}

export function computeStats(levels: Readonly<UpgradeLevels>): CarStats {
    return {
        maxHealth: ARENA.MAX_HEALTH + levels.armor * upgradeDef('armor').perLevel,
        speedMult: 1 + levels.engine * upgradeDef('engine').perLevel,
        smashMinSpeed: Math.max(
            SCRAP.MIN_SMASH_SPEED_FLOOR,
            ARENA.SMASH_MIN_SPEED - levels.ram * upgradeDef('ram').perLevel
        ),
        nitroMs: ARENA.NITRO_MS * (1 + levels.nitro * upgradeDef('nitro').perLevel)
    };
}

export function scrapEarned(smashes: number, wave: number): number {
    return Math.max(0, smashes) * SCRAP.PER_SMASH + Math.max(0, wave) * SCRAP.PER_WAVE;
}

/** Cloud saves are untrusted: keep only known ids with integer levels inside their range. */
export function sanitizeLevels(raw: unknown): UpgradeLevels {
    const levels: UpgradeLevels = { ...NO_UPGRADES };
    if (typeof raw !== 'object' || raw === null) return levels;

    const source = raw as Record<string, unknown>;
    for (const upgrade of UPGRADES) {
        const value = source[upgrade.id];
        if (typeof value === 'number' && Number.isFinite(value)) {
            levels[upgrade.id] = Math.min(upgrade.maxLevel, Math.max(0, Math.floor(value)));
        }
    }
    return levels;
}

/** Short human-readable effect of an upgrade at a given level, e.g. "+40 HP". */
export function effectLabel(id: UpgradeId, level: number): string {
    const stats = computeStats({ ...NO_UPGRADES, [id]: level });
    switch (id) {
        case 'armor':
            return `+${stats.maxHealth - ARENA.MAX_HEALTH} HP`;
        case 'engine':
            return `+${Math.round((stats.speedMult - 1) * 100)}% SPEED`;
        case 'ram':
            return `RAM AT ${Math.round(stats.smashMinSpeed)}`;
        case 'nitro':
            return `+${Math.round((stats.nitroMs / ARENA.NITRO_MS - 1) * 100)}% NITRO`;
    }
}
