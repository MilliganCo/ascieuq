// Симуляция игры: шаг, патрули, коллизии

import { World } from './world';
import { C, complex, mobius, dist, scale } from '../core/hyper';
import { Cell, findNearestCell } from '../core/tiling';
import { Portal, applyPortal } from '../core/portals';
import { visibleSet } from '../core/fov';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  dash: boolean;
  interact: boolean;
}

export interface GameState {
  world: World;
  playerZ: C;           // Позиция игрока (всегда близко к 0 после изометрии)
  transform: { a: C; theta: number }; // Текущая изометрия "мира"
  dashCooldown: number;
  guards: Map<number, { currentCell: number; path: number[]; pathIndex: number }>;
  visibleCells: Set<number>;
  gameOver: boolean;
  won: boolean;
}

const STEP_SIZE = 0.1;
const DASH_MULTIPLIER = 2.0;
const DASH_COOLDOWN = 5.0;
const GUARD_VISION_RANGE = 1.5;

export function initGameState(world: World): GameState {
  const guards = new Map<number, { currentCell: number; path: number[]; pathIndex: number }>();
  
  // Инициализируем патрули стражей (простой цикл)
  for (const guardId of world.guards) {
    const guardCell = world.cells[guardId];
    const path: number[] = [guardId];
    
    // Строим простой цикл из соседей
    let current = guardId;
    const visited = new Set<number>();
    visited.add(current);
    
    for (let i = 0; i < 5 && path.length < 10; i++) {
      const cell = world.cells[current];
      const candidates = cell.neighbors.filter((nid, idx) => 
        !cell.walls[idx] && !visited.has(nid) && world.guards.includes(nid)
      );
      
      if (candidates.length > 0) {
        const next = candidates[0];
        path.push(next);
        visited.add(next);
        current = next;
      } else {
        break;
      }
    }
    
    guards.set(guardId, { currentCell: guardId, path, pathIndex: 0 });
  }
  
  return {
    world,
    playerZ: complex(0, 0),
    transform: { a: complex(0, 0), theta: 0 },
    dashCooldown: 0,
    guards,
    visibleCells: new Set(),
    gameOver: false,
    won: false
  };
}

// Преобразовать ввод в изометрию шага
function inputToMobius(input: InputState, dashCooldown: number): { a: C; theta: number } | null {
  if (!input.up && !input.down && !input.left && !input.right) {
    return null;
  }
  
  let dx = 0;
  let dy = 0;
  
  if (input.up) dy += STEP_SIZE;
  if (input.down) dy -= STEP_SIZE;
  if (input.left) dx -= STEP_SIZE;
  if (input.right) dx += STEP_SIZE;
  
  const stepSize = input.dash && dashCooldown <= 0 ? STEP_SIZE * DASH_MULTIPLIER : STEP_SIZE;
  const step = complex(dx * stepSize, dy * stepSize);
  
  // Изометрия, которая двигает мир так, чтобы игрок остался в центре
  // В модели Пуанкаре для движения на вектор step нужно применить изометрию
  // которая переносит -step в 0, то есть центр изометрии примерно в -step
  // Упрощённая аппроксимация для малых шагов
  const stepAbs = Math.sqrt(step.re * step.re + step.im * step.im);
  if (stepAbs < 1e-6) return null;
  
  // Для малых шагов используем приближение: изометрия с центром в -step
  return { a: scale(step, -1), theta: 0 };
}

export function tick(gameState: GameState, input: InputState, dt: number): void {
  if (gameState.gameOver) return;
  
  // Обновляем кулдаун рывка
  if (gameState.dashCooldown > 0) {
    gameState.dashCooldown = Math.max(0, gameState.dashCooldown - dt);
  }
  
  // Получаем изометрию шага
  const stepIso = inputToMobius(input, gameState.dashCooldown);
  if (stepIso) {
    // Рывок потребляет кулдаун
    if (input.dash && gameState.dashCooldown <= 0) {
      gameState.dashCooldown = DASH_COOLDOWN;
    }
    
    // Применяем изометрию ко всем ячейкам (игрок остаётся в центре)
    for (const cell of gameState.world.cells) {
      cell.z = mobius(cell.z, stepIso.a, stepIso.theta);
    }
    
    // Обновляем трансформацию порталов
    for (const portal of gameState.world.portals) {
      portal.psi.a = mobius(portal.psi.a, stepIso.a, stepIso.theta);
    }
    
    // Композиция трансформаций
    gameState.transform = {
      a: mobius(gameState.transform.a, stepIso.a, stepIso.theta),
      theta: gameState.transform.theta + stepIso.theta
    };
  }
  
  // Обновляем патрули стражей
  updateGuards(gameState, dt);
  
  // Игрок всегда в центре (0,0), находим текущую ячейку
  const playerCell = findNearestCell(gameState.world.cells, gameState.playerZ);
  gameState.world.playerCell = playerCell;
  
  // Проверяем порталы
  for (const portal of gameState.world.portals) {
    if (playerCell === portal.a || playerCell === portal.b) {
      if (input.interact) {
        const newCellId = applyPortal(gameState.world.cells, portal, playerCell);
        // Телепортируем: перемещаем целевую ячейку портала в центр
        const targetCell = gameState.world.cells[newCellId];
        const teleportIso = { a: scale(targetCell.z, -1), theta: 0 };
        
        // Применяем изометрию телепорта
        for (const cell of gameState.world.cells) {
          cell.z = mobius(cell.z, teleportIso.a, teleportIso.theta);
        }
        
        // Обновляем трансформацию порталов
        for (const p of gameState.world.portals) {
          p.psi.a = mobius(p.psi.a, teleportIso.a, teleportIso.theta);
        }
        
        gameState.transform = {
          a: mobius(gameState.transform.a, teleportIso.a, teleportIso.theta),
          theta: gameState.transform.theta + teleportIso.theta
        };
      }
    }
  }
  
  // Проверяем сбор сигилов
  if (gameState.world.sigils.has(playerCell)) {
    gameState.world.sigils.delete(playerCell);
    gameState.world.collectedSigils++;
  }
  
  // Проверяем выход
  if (playerCell === gameState.world.exit && gameState.world.collectedSigils >= 5) {
    gameState.won = true;
    gameState.gameOver = true;
  }
  
  // Проверяем видимость стражей
  checkGuardVision(gameState);
  
  // Обновляем FOV
  gameState.visibleCells = visibleSet(
    gameState.world.cells,
    gameState.playerZ,
    3.0,
    Math.PI * 2
  );
}

function updateGuards(gameState: GameState, dt: number): void {
  const guardSpeed = 0.5; // ячеек в секунду
  
  for (const [guardId, guard] of gameState.guards.entries()) {
    if (guard.path.length < 2) continue;
    
    // Простое патрулирование по циклу
    const currentTime = Date.now() / 1000;
    const cycleTime = guard.path.length / guardSpeed;
    const position = (currentTime % cycleTime) / cycleTime;
    const pathIndex = Math.floor(position * guard.path.length);
    
    guard.pathIndex = pathIndex % guard.path.length;
    guard.currentCell = guard.path[guard.pathIndex];
  }
}

function checkGuardVision(gameState: GameState): void {
  const playerCell = findNearestCell(gameState.world.cells, gameState.playerZ);
  const playerZ = gameState.world.cells[playerCell].z;
  
  for (const [guardId, guard] of gameState.guards.entries()) {
    const guardCell = gameState.world.cells[guard.currentCell];
    const guardZ = guardCell.z;
    
    // Проверяем расстояние
    const d = dist(guardZ, playerZ);
    if (d > GUARD_VISION_RANGE) continue;
    
    // Проверяем прямую видимость
    const guardVisible = visibleSet(
      gameState.world.cells,
      guardZ,
      GUARD_VISION_RANGE,
      Math.PI
    );
    
    if (guardVisible.has(playerCell)) {
      // Игрок виден стражу - поражение
      gameState.gameOver = true;
      gameState.won = false;
    }
  }
}

