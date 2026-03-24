// FSM для состояний игры

export enum GameMode {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  VICTORY = 'victory'
}

export class GameFSM {
  private mode: GameMode = GameMode.MENU;
  
  get currentMode(): GameMode {
    return this.mode;
  }
  
  startGame(): void {
    if (this.mode === GameMode.MENU) {
      this.mode = GameMode.PLAYING;
    }
  }
  
  pause(): void {
    if (this.mode === GameMode.PLAYING) {
      this.mode = GameMode.PAUSED;
    }
  }
  
  resume(): void {
    if (this.mode === GameMode.PAUSED) {
      this.mode = GameMode.PLAYING;
    }
  }
  
  gameOver(won: boolean): void {
    if (this.mode === GameMode.PLAYING) {
      this.mode = won ? GameMode.VICTORY : GameMode.GAME_OVER;
    }
  }
  
  returnToMenu(): void {
    this.mode = GameMode.MENU;
  }
}

