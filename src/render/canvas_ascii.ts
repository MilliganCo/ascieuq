// Canvas2D ASCII рендер

import { Cell } from '../core/tiling';
import { C, dist } from '../core/hyper';

export type CharGrid = string[][];
export type ColorGrid = string[][];

const GLYPH_LUT = " .'`:;-_=+*#%@";
const GLYPH_WALL = '#';
const GLYPH_PORTAL = '∘';
const GLYPH_SIGIL = '✶';
const GLYPH_GUARD = '§';
const GLYPH_PLAYER = '@';
const GLYPH_EXIT = 'E';

const GRID_WIDTH = 80;
const GRID_HEIGHT = 45;

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  charWidth: number;
  charHeight: number;
}

export function initCanvas(canvas: HTMLCanvasElement): RenderContext {
  const ctx = canvas.getContext('2d')!;
  
  // Устанавливаем размеры canvas
  canvas.width = GRID_WIDTH * 16;  // 16px на символ
  canvas.height = GRID_HEIGHT * 24; // 24px на символ
  
  // Настраиваем шрифт
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const charWidth = 16;
  const charHeight = 24;
  
  return { canvas, ctx, charWidth, charHeight };
}

export function draw(
  context: RenderContext,
  cells: Cell[],
  visibleCells: Set<number>,
  playerCell: number,
  sigils: Set<number>,
  exit: number,
  guards: Map<number, number>, // guardId -> cellId
  portals: Set<number>
): void {
  const { ctx, charWidth, charHeight } = context;
  
  // Очищаем canvas
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, context.canvas.width, context.canvas.height);
  
  // Проецируем ячейки на экран
  const grid: CharGrid = [];
  const colors: ColorGrid = [];
  
  // Инициализируем сетку
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = [];
    colors[y] = [];
    for (let x = 0; x < GRID_WIDTH; x++) {
      grid[y][x] = ' ';
      colors[y][x] = '#000';
    }
  }
  
  // Проецируем ячейки на экран (проекция модели Пуанкаре)
  const centerX = GRID_WIDTH / 2;
  const centerY = GRID_HEIGHT / 2;
  const scale = Math.min(GRID_WIDTH, GRID_HEIGHT) * 0.35;
  
  // Сортируем ячейки по расстоянию от центра (ближние рендерятся первыми)
  const sortedCells = [...cells].filter(c => visibleCells.has(c.id))
    .sort((a, b) => {
      const rA = Math.sqrt(a.z.re * a.z.re + a.z.im * a.z.im);
      const rB = Math.sqrt(b.z.re * b.z.re + b.z.im * b.z.im);
      return rA - rB;
    });
  
  for (const cell of sortedCells) {
    // Проекция диска Пуанкаре на экран
    const r = Math.sqrt(cell.z.re * cell.z.re + cell.z.im * cell.z.im);
    if (r >= 0.95) continue;
    
    // Проекция Пуанкаре: просто масштабируем координаты
    const screenX = Math.round(centerX + cell.z.re * scale);
    const screenY = Math.round(centerY + cell.z.im * scale);
    
    if (screenX < 0 || screenX >= GRID_WIDTH || screenY < 0 || screenY >= GRID_HEIGHT) {
      continue;
    }
    
    // Определяем символ
    let glyph = ' ';
    let color = '#0f0';
    
    if (cell.id === playerCell) {
      glyph = GLYPH_PLAYER;
      color = '#ff0';
    } else if (cell.id === exit) {
      glyph = GLYPH_EXIT;
      color = '#0ff';
    } else if (sigils.has(cell.id)) {
      glyph = GLYPH_SIGIL;
      color = '#f0f';
    } else if (portals.has(cell.id)) {
      glyph = GLYPH_PORTAL;
      color = '#00f';
    } else {
      // Проверяем стражей
      let isGuard = false;
      for (const guardCellId of guards.values()) {
        if (guardCellId === cell.id) {
          glyph = GLYPH_GUARD;
          color = '#f00';
          isGuard = true;
          break;
        }
      }
      
      if (!isGuard) {
        // Определяем по стенам и видимости
        const wallCount = cell.walls.filter(w => w).length;
        const hasWalls = wallCount > 0;
        
        if (hasWalls && wallCount >= cell.neighbors.length * 0.6) {
          glyph = GLYPH_WALL;
          color = '#666';
        } else {
          // По яркости на основе расстояния и видимости
          const brightness = Math.max(0.3, Math.min(1, 1.2 - r * 1.2));
          const glyphIndex = Math.floor(brightness * (GLYPH_LUT.length - 1));
          glyph = GLYPH_LUT[glyphIndex];
          const green = Math.floor(brightness * 200);
          color = `rgb(0, ${green}, 0)`;
        }
      }
    }
    
    grid[screenY][screenX] = glyph;
    colors[screenY][screenX] = color;
  }
  
  // Рендерим сетку
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const glyph = grid[y][x];
      const color = colors[y][x];
      
      if (glyph !== ' ') {
        ctx.fillStyle = color;
        ctx.fillText(
          glyph,
          x * charWidth + charWidth / 2,
          y * charHeight + charHeight / 2
        );
      }
    }
  }
}

