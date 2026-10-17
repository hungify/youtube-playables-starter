import { DOM_IDS, SCREENS, TEXT, type ScreenName } from '@core/Constants';
import { EventBus, Events } from '@core/EventBus';
import { gameState } from '@core/GameState';

function byId<T extends HTMLElement = HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing #${id} in index.html`);
    return element as T;
}

/**
 * DOM overlay for menus and the HUD. Plain HTML buttons get native focus, keyboard access and
 * the 48dp touch size from CSS, which is simpler than drawing UI inside the 3D scene.
 */
export class Hud {
    private readonly hud = byId(DOM_IDS.HUD);
    private readonly score = byId(DOM_IDS.SCORE);
    private readonly timer = byId(DOM_IDS.TIMER);
    private readonly combo = byId(DOM_IDS.COMBO);
    private readonly menu = byId(DOM_IDS.MENU);
    private readonly menuBest = byId(DOM_IDS.MENU_BEST);
    private readonly gameOver = byId(DOM_IDS.GAME_OVER);
    private readonly gameOverTitle = byId(DOM_IDS.GAME_OVER_TITLE);
    private readonly gameOverScore = byId(DOM_IDS.GAME_OVER_SCORE);
    private readonly gameOverBest = byId(DOM_IDS.GAME_OVER_BEST);
    private readonly paused = byId(DOM_IDS.PAUSED);
    private shownSeconds = -1;

    constructor(onPlay: () => void) {
        byId(DOM_IDS.MENU_TITLE).textContent = TEXT.TITLE;
        byId(DOM_IDS.MENU_HINT).textContent = TEXT.HINT;
        byId(DOM_IDS.PLAY).textContent = TEXT.PLAY;
        byId(DOM_IDS.PLAY_AGAIN).textContent = TEXT.PLAY_AGAIN;
        this.paused.textContent = TEXT.PAUSED;

        byId(DOM_IDS.PLAY).addEventListener('click', onPlay);
        byId(DOM_IDS.PLAY_AGAIN).addEventListener('click', onPlay);

        EventBus.on(Events.SCREEN_CHANGED, ({ screen }) => this.show(screen));
        EventBus.on(Events.SCORE_CHANGED, ({ score }) => {
            this.score.textContent = `${TEXT.SCORE} ${score}`;
        });
        EventBus.on(Events.GEM_COLLECTED, ({ combo }) => {
            this.combo.textContent = combo > 1 ? `${TEXT.COMBO_PREFIX}${combo}` : '';
        });
    }

    show(screen: ScreenName): void {
        this.hud.hidden = screen !== SCREENS.GAME;
        this.menu.hidden = screen !== SCREENS.MENU;
        this.gameOver.hidden = screen !== SCREENS.GAME_OVER;

        if (screen === SCREENS.MENU) {
            this.menuBest.textContent = `${TEXT.BEST} ${gameState.bestScore}`;
        } else if (screen === SCREENS.GAME) {
            this.combo.textContent = '';
            this.shownSeconds = -1;
        } else if (screen === SCREENS.GAME_OVER) {
            this.gameOverTitle.textContent = gameState.newBest ? TEXT.NEW_BEST : TEXT.TIME_UP;
            this.gameOverScore.textContent = `${TEXT.SCORE} ${gameState.score}`;
            this.gameOverBest.textContent = `${TEXT.BEST} ${gameState.bestScore}`;
        }
    }

    /** Per-frame refresh; touches the DOM only when the shown second changes. */
    update(): void {
        const seconds = Math.ceil(gameState.timeLeftMs / 1000);
        if (seconds === this.shownSeconds) return;
        this.shownSeconds = seconds;
        this.timer.textContent = `${seconds}s`;
    }

    setPaused(paused: boolean): void {
        this.paused.hidden = !paused;
    }
}
