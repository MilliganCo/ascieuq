// HUD: информация о состоянии игры

import { GameState } from '../game/sim';

export function updateHUD(element: HTMLElement, gameState: GameState): void {
  const sigilsCollected = gameState.world.collectedSigils;
  const sigilsTotal = 5;
  const dashReady = gameState.dashCooldown <= 0;
  const dashCooldown = Math.ceil(gameState.dashCooldown);
  
  let html = `
    <div>Сигилы: ${sigilsCollected}/${sigilsTotal}</div>
    <div>Рывок: ${dashReady ? 'ГОТОВ' : `КД: ${dashCooldown}с`}</div>
  `;
  
  if (gameState.gameOver) {
    if (gameState.won) {
      html += '<div style="color: #0f0; font-size: 18px; margin-top: 10px;">ПОБЕДА!</div>';
    } else {
      html += '<div style="color: #f00; font-size: 18px; margin-top: 10px;">ПОРАЖЕНИЕ</div>';
    }
  }
  
  element.innerHTML = html;
}

