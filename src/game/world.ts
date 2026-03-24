// Генерация уровня и мир игры

import { Cell, buildDisk, findNearestCell } from '../core/tiling';
import { Portal, createPortals } from '../core/portals';
import { C, complex } from '../core/hyper';
import { RNG } from '../core/rng';

export interface World {
  cells: Cell[];
  portals: Portal[];
  sigils: Set<number>;      // Индексы ячеек с сигилами
  exit: number;             // Индекс ячейки выхода
  guards: number[];         // Индексы ячеек со стражами
  playerCell: number;       // Текущая ячейка игрока
  collectedSigils: number;  // Собранные сигилы
}

export function generateWorld(radius: number = 8, seed?: number): World {
  const rng = new RNG(seed);
  
  // Построить тесселяцию
  const cells = buildDisk(radius, rng);
  
  // Разместить выход (далеко от центра)
  let exitId = 0;
  let maxDist = 0;
  for (let i = 0; i < cells.length; i++) {
    const r = Math.sqrt(cells[i].z.re * cells[i].z.re + cells[i].z.im * cells[i].z.im);
    if (r > maxDist && r < 0.9) {
      maxDist = r;
      exitId = i;
    }
  }
  
  // Разместить сигилы (5 штук, минимизируя расстояние между ними)
  const sigils = new Set<number>();
  const sigilCandidates: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const r = Math.sqrt(cells[i].z.re * cells[i].z.re + cells[i].z.im * cells[i].z.im);
    if (r > 0.3 && r < 0.85 && i !== exitId) {
      sigilCandidates.push(i);
    }
  }
  
  const shuffled = rng.shuffle([...sigilCandidates]);
  for (let i = 0; i < Math.min(5, shuffled.length); i++) {
    sigils.add(shuffled[i]);
  }
  
  // Разместить порталы (2-3 пары)
  const portals = createPortals(cells, 2 + rng.int(2), rng);
  
  // Разместить стражей (патрулируют по циклам)
  const guards: number[] = [];
  const guardCandidates: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const r = Math.sqrt(cells[i].z.re * cells[i].z.re + cells[i].z.im * cells[i].z.im);
    // Стражи размещаются на средних расстояниях, не слишком близко к старту
    if (r > 0.3 && r < 0.85 && !sigils.has(i) && i !== exitId) {
      guardCandidates.push(i);
    }
  }
  
  const shuffledGuards = rng.shuffle([...guardCandidates]);
  const guardCount = Math.min(4, Math.floor(cells.length / 20)); // Динамическое количество стражей
  for (let i = 0; i < guardCount; i++) {
    guards.push(shuffledGuards[i]);
  }
  
  return {
    cells,
    portals,
    sigils,
    exit: exitId,
    guards,
    playerCell: 0, // Старт в центре
    collectedSigils: 0
  };
}

