import Phaser from 'phaser';
import { GAME_CONFIG } from '@core/Constants';
import { Boot } from '@scenes/Boot';
import { Game } from '@scenes/Game';
import { GameOver } from '@scenes/GameOver';
import { MainMenu } from '@scenes/MainMenu';
import { Preloader } from '@scenes/Preloader';
import { UI } from '@scenes/UI';

export const phaserGameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
    parent: 'gameParent',
    scale: {
        mode: Phaser.Scale.EXPAND
    },
    scene: [Boot, Preloader, MainMenu, Game, GameOver, UI]
};
