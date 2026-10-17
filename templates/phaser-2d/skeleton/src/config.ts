import Phaser from 'phaser';
import { COLORS, GAME_CONFIG } from '@core/Constants';
import { Boot } from '@scenes/Boot';
import { Game } from '@scenes/Game';
import { GameOver } from '@scenes/GameOver';
import { MainMenu } from '@scenes/MainMenu';
import { Preloader } from '@scenes/Preloader';

export const phaserGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
    parent: 'gameParent',
    backgroundColor: COLORS.BACKGROUND,
    scale: {
        mode: Phaser.Scale.EXPAND,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Boot, Preloader, MainMenu, Game, GameOver]
};
