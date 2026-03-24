// Поле зрения в H²

import { C, complex, dist, geodesic } from './hyper';
import { Cell } from './tiling';

// Набор видимых ячеек из точки origin в радиусе maxD
export function visibleSet(
  cells: Cell[],
  origin: C,
  maxD: number,
  fovAngle: number = Math.PI * 2 // полный обзор по умолчанию
): Set<number> {
  const visible = new Set<number>();
  
  // Находим ячейку игрока
  let playerCellId = 0;
  let minDist = Infinity;
  for (const cell of cells) {
    const d = dist(cell.z, origin);
    if (d < minDist) {
      minDist = d;
      playerCellId = cell.id;
    }
  }
  
  visible.add(playerCellId);
  
  // BFS от игрока с проверкой видимости
  const queue: { id: number; path: number[] }[] = [{ id: playerCellId, path: [playerCellId] }];
  const processed = new Set<number>();
  processed.add(playerCellId);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    const cell = cells[current.id];
    
    // Проверяем расстояние
    const d = dist(cell.z, origin);
    if (d > maxD) continue;
    
    // Проверяем видимость: есть ли прямая видимость по геодезии?
    const isVisible = checkLineOfSight(cells, origin, cell.z, current.path);
    
    if (isVisible) {
      visible.add(current.id);
      
      // Добавляем соседей
      for (let i = 0; i < cell.neighbors.length; i++) {
        const neighborId = cell.neighbors[i];
        if (!processed.has(neighborId) && !cell.walls[i]) {
          processed.add(neighborId);
          queue.push({ id: neighborId, path: [...current.path, neighborId] });
        }
      }
    }
  }
  
  return visible;
}

// Проверка прямой видимости между двумя точками
function checkLineOfSight(
  cells: Cell[],
  u: C,
  v: C,
  path: number[]
): boolean {
  // Упрощённая проверка: если есть путь без стен, считаем видимым
  // В идеале нужно проверять пересечение геодезии со стенами
  
  // Простая эвристика: проверяем точки на геодезии
  const geo = geodesic(u, v, 20);
  
  for (const point of geo) {
    // Находим ближайшую ячейку
    let nearestId = 0;
    let minDist = Infinity;
    for (const cell of cells) {
      const d = dist(cell.z, point);
      if (d < minDist) {
        minDist = d;
        nearestId = cell.id;
      }
    }
    
    // Если точка на пути - разрешено
    if (path.includes(nearestId)) continue;
    
    // Проверяем, не пересекает ли стена
    const cell = cells[nearestId];
    // Упрощённая проверка: если точка близко к центру ячейки, разрешаем
    if (minDist > 0.15) {
      // Возможно пересечение со стеной, проверяем соседей
      let hasOpenPath = false;
      for (let i = 0; i < cell.neighbors.length; i++) {
        if (!cell.walls[i] && path.includes(cell.neighbors[i])) {
          hasOpenPath = true;
          break;
        }
      }
      if (!hasOpenPath) return false;
    }
  }
  
  return true;
}

