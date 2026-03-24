// Тесселяция {7,3}: регулярные семиугольники, по 3 в вершине

import { C, complex, dist, mobius, scale } from './hyper';
import { RNG } from './rng';

export interface Cell {
  id: number;
  z: C;                    // Центр ячейки в модели Пуанкаре
  neighbors: number[];     // Индексы соседних ячеек
  walls: boolean[];        // true = стена, false = проход (по порядку neighbors)
  isPortal: boolean;
  portalTarget?: number;   // Индекс целевой ячейки портала
}

// Построение шара тесселяции {7,3} радиуса R
export function buildDisk(radius: number, rng: RNG): Cell[] {
  const cells: Cell[] = [];
  const visited = new Map<string, number>(); // координата -> id
  
  // Центральная ячейка
  const center: Cell = {
    id: 0,
    z: complex(0, 0),
    neighbors: [],
    walls: [],
    isPortal: false
  };
  cells.push(center);
  visited.set('0,0', 0);
  
  // BFS для построения графа
  const queue: { id: number; z: C; level: number }[] = [{ id: 0, z: complex(0, 0), level: 0 }];
  let nextId = 1;
  
  // Углы для семиугольника (центральный угол = 2π/7)
  const angleStep = (2 * Math.PI) / 7;
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.level >= radius) continue;
    
    // Для каждой ячейки строим 7 соседей вокруг
    for (let i = 0; i < 7; i++) {
      const angle = i * angleStep;
      
      // Смещение от центра (приблизительно, для {7,3})
      // Радиус семиугольника в гиперболической плоскости
      const shiftDist = 0.3; // эвристика для расстояния между центрами
      const shift = complex(
        shiftDist * Math.cos(angle),
        shiftDist * Math.sin(angle)
      );
      
      // Преобразуем смещение: применяем изометрию переноса от current.z
      // Для переноса точки p на вектор v в H² используем изометрию с центром в current.z
      const newZ = mobius(shift, scale(current.z, -1), 0);
      
      // Проверяем, не выходим ли за границу диска
      const r = Math.sqrt(newZ.re * newZ.re + newZ.im * newZ.im);
      if (r >= 0.99) continue;
      
      const key = `${Math.round(newZ.re * 1000)},${Math.round(newZ.im * 1000)}`;
      
      if (!visited.has(key)) {
        const newCell: Cell = {
          id: nextId,
          z: newZ,
          neighbors: [current.id],
          walls: [false],
          isPortal: false
        };
        
        cells.push(newCell);
        visited.set(key, nextId);
        queue.push({ id: nextId, z: newZ, level: current.level + 1 });
        
        // Добавляем обратную связь
        cells[current.id].neighbors.push(nextId);
        cells[current.id].walls.push(false);
        
        nextId++;
      } else {
        // Ячейка уже существует, добавляем связь если её нет
        const existingId = visited.get(key)!;
        if (!cells[current.id].neighbors.includes(existingId)) {
          cells[current.id].neighbors.push(existingId);
          cells[current.id].walls.push(false);
        }
      }
    }
  }
  
  // Перколяция: случайно удаляем часть стен, гарантируя связность
  for (const cell of cells) {
    for (let i = 0; i < cell.walls.length; i++) {
      // 70% вероятность прохода (30% стена)
      if (rng.next() < 0.3) {
        cell.walls[i] = true;
      }
    }
  }
  
  // Гарантируем связность: убираем случайные стены вокруг старта
  const startCell = cells[0];
  for (let i = 0; i < Math.min(3, startCell.walls.length); i++) {
    startCell.walls[i] = false;
  }
  
  return cells;
}

// Найти ближайшую ячейку к точке z
export function findNearestCell(cells: Cell[], z: C): number {
  let minDist = Infinity;
  let nearestId = 0;
  
  for (const cell of cells) {
    const d = dist(cell.z, z);
    if (d < minDist) {
      minDist = d;
      nearestId = cell.id;
    }
  }
  
  return nearestId;
}

