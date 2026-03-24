// Порталы: пары ячеек с изометрией перехода

import { C, mobius, compose } from './hyper';
import { Cell } from './tiling';
import { RNG } from './rng';

export interface Portal {
  a: number;              // Индекс ячейки A
  b: number;              // Индекс ячейки B
  psi: { a: C; theta: number }; // Изометрия перехода: из A в B
}

// Создать пары порталов
export function createPortals(cells: Cell[], count: number, rng: RNG): Portal[] {
  const portals: Portal[] = [];
  const used = new Set<number>();
  
  // Выбираем случайные пары ячеек (не слишком близко к центру)
  const candidates: number[] = [];
  for (let i = 0; i < cells.length; i++) {
    const r = Math.sqrt(cells[i].z.re * cells[i].z.re + cells[i].z.im * cells[i].z.im);
    if (r > 0.2 && r < 0.8) {
      candidates.push(i);
    }
  }
  
  const shuffled = rng.shuffle([...candidates]);
  
  for (let i = 0; i < Math.min(count, Math.floor(shuffled.length / 2)); i++) {
    const idxA = shuffled[i * 2];
    const idxB = shuffled[i * 2 + 1];
    
    if (used.has(idxA) || used.has(idxB)) continue;
    
    used.add(idxA);
    used.add(idxB);
    
    // Вычисляем изометрию перехода из A в B
    // psi должен быть такой, что psi(z_A) ≈ z_B
    const zA = cells[idxA].z;
    const zB = cells[idxB].z;
    
    // Упрощённая изометрия: поворот + перенос
    // В идеале нужно решить уравнение ψ(z_A) = z_B
    const angle = Math.atan2(zB.im - zA.im, zB.re - zA.re);
    const psi = {
      a: zA,
      theta: angle
    };
    
    portals.push({ a: idxA, b: idxB, psi });
    
    // Отмечаем ячейки как порталы
    cells[idxA].isPortal = true;
    cells[idxA].portalTarget = idxB;
    cells[idxB].isPortal = true;
    cells[idxB].portalTarget = idxA;
  }
  
  return portals;
}

// Применить портал: телепортировать из ячейки portalCell в целевую
export function applyPortal(
  cells: Cell[],
  portal: Portal,
  currentCellId: number
): number {
  if (currentCellId === portal.a) {
    return portal.b;
  } else if (currentCellId === portal.b) {
    return portal.a;
  }
  return currentCellId;
}

