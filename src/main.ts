// Главный файл игры

import { initCanvas, draw } from './render/canvas_ascii';
import { generateWorld } from './game/world';
import { initGameState, tick, InputState } from './game/sim';
import { updateHUD } from './render/hud';
import { GameFSM, GameMode } from './game/fsm';

// Инициализация
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const hudElement = document.getElementById('hud') as HTMLElement;

if (!canvas || !hudElement) {
  throw new Error('Canvas or HUD element not found');
}

const renderContext = initCanvas(canvas);
const fsm = new GameFSM();

// Генерация мира
let world = generateWorld(8);
let gameState = initGameState(world);

// Состояние ввода
const input: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  dash: false,
  interact: false
};

// Обработка клавиатуры
document.addEventListener('keydown', (e) => {
  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      input.up = true;
      break;
    case 's':
    case 'arrowdown':
      input.down = true;
      break;
    case 'a':
    case 'arrowleft':
      input.left = true;
      break;
    case 'd':
    case 'arrowright':
      input.right = true;
      break;
    case ' ':
      input.dash = true;
      e.preventDefault();
      break;
    case 'e':
      input.interact = true;
      break;
    case 'enter':
      if (fsm.currentMode === GameMode.MENU) {
        fsm.startGame();
      } else if (fsm.currentMode === GameMode.GAME_OVER || fsm.currentMode === GameMode.VICTORY) {
        world = generateWorld(8);
        gameState = initGameState(world);
        fsm.returnToMenu();
        fsm.startGame();
      }
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      input.up = false;
      break;
    case 's':
    case 'arrowdown':
      input.down = false;
      break;
    case 'a':
    case 'arrowleft':
      input.left = false;
      break;
    case 'd':
    case 'arrowright':
      input.right = false;
      break;
    case ' ':
      input.dash = false;
      break;
    case 'e':
      input.interact = false;
      break;
  }
});

// Игровой цикл
let lastTime = performance.now();

function gameLoop(currentTime: number) {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.1); // Ограничиваем dt
  lastTime = currentTime;
  
  if (fsm.currentMode === GameMode.PLAYING) {
    // Обновляем игру
    tick(gameState, input, dt);
    
    // Проверяем окончание игры
    if (gameState.gameOver) {
      fsm.gameOver(gameState.won);
    }
  }
  
  // Рендерим
  if (fsm.currentMode === GameMode.PLAYING || 
      fsm.currentMode === GameMode.GAME_OVER || 
      fsm.currentMode === GameMode.VICTORY) {
    
    // Преобразуем guards Map в формат для рендера
    const guardsMap = new Map<number, number>();
    for (const [guardId, guard] of gameState.guards.entries()) {
      guardsMap.set(guardId, guard.currentCell);
    }
    
    const portalsSet = new Set<number>();
    for (const portal of gameState.world.portals) {
      portalsSet.add(portal.a);
      portalsSet.add(portal.b);
    }
    
    draw(
      renderContext,
      gameState.world.cells,
      gameState.visibleCells,
      gameState.world.playerCell,
      gameState.world.sigils,
      gameState.world.exit,
      guardsMap,
      portalsSet
    );
    
    updateHUD(hudElement, gameState);
  } else if (fsm.currentMode === GameMode.MENU) {
    // Рендерим меню
    renderContext.ctx.fillStyle = '#000';
    renderContext.ctx.fillRect(0, 0, renderContext.canvas.width, renderContext.canvas.height);
    renderContext.ctx.fillStyle = '#0f0';
    renderContext.ctx.font = '24px "Courier New", monospace';
    renderContext.ctx.textAlign = 'center';
    renderContext.ctx.fillText(
      'ASCII HyperMaze',
      renderContext.canvas.width / 2,
      renderContext.canvas.height / 2 - 40
    );
    renderContext.ctx.font = '16px "Courier New", monospace';
    renderContext.ctx.fillText(
      'Нажмите ENTER для начала',
      renderContext.canvas.width / 2,
      renderContext.canvas.height / 2
    );
    
    hudElement.innerHTML = `
      <div>WASD/Стрелки - движение</div>
      <div>Пробел - рывок</div>
      <div>E - взаимодействие с порталом</div>
      <div>Соберите 5 сигилов и дойдите до выхода!</div>
    `;
  }
  
  requestAnimationFrame(gameLoop);
}

// Запуск
requestAnimationFrame(gameLoop);

