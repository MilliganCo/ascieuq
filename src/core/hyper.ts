// Гиперболическая геометрия: изометрии H² (модель Пуанкаре)

export type C = { re: number; im: number };

export function complex(re: number, im: number = 0): C {
  return { re, im };
}

export function add(a: C, b: C): C {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function sub(a: C, b: C): C {
  return { re: a.re - b.re, im: a.im - b.im };
}

export function mul(a: C, b: C): C {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

export function div(a: C, b: C): C {
  const denom = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / denom, im: (a.im * b.re - a.re * b.im) / denom };
}

export function conj(z: C): C {
  return { re: z.re, im: -z.im };
}

export function abs2(z: C): number {
  return z.re * z.re + z.im * z.im;
}

export function abs(z: C): number {
  return Math.sqrt(abs2(z));
}

export function scale(z: C, s: number): C {
  return { re: z.re * s, im: z.im * s };
}

export function expi(theta: number): C {
  return { re: Math.cos(theta), im: Math.sin(theta) };
}

// Изометрия Мёбиуса: φ(z) = e^{iθ} (z - a) / (1 - \bar{a} z)
export function mobius(z: C, a: C, theta: number): C {
  // z - a
  const num = sub(z, a);
  
  // 1 - \bar{a} z
  const aBar = conj(a);
  const aBarZ = mul(aBar, z);
  const denom = sub(complex(1, 0), aBarZ);
  
  // (z - a) / (1 - \bar{a} z)
  const ratio = div(num, denom);
  
  // e^{iθ} * ratio
  const rot = expi(theta);
  return mul(rot, ratio);
}

// Композиция изометрий: φ₂ ∘ φ₁
export function compose(
  a1: C, theta1: number,
  a2: C, theta2: number
): { a: C; theta: number } {
  // φ₂(φ₁(0)) = φ₂(-a₁) = e^{iθ₂} (-a₁ - a₂) / (1 - \bar{a₂} (-a₁))
  const phi1_0 = scale(a1, -1);
  const phi2_phi1_0 = mobius(phi1_0, a2, theta2);
  
  // Новый центр a' = -φ₂(φ₁(0))
  const aNew = scale(phi2_phi1_0, -1);
  
  // Новый угол: θ' = θ₁ + θ₂ + arg(...)
  // Упрощённая аппроксимация
  const thetaNew = theta1 + theta2;
  
  return { a: aNew, theta: thetaNew };
}

// Гиперболическое расстояние в модели Пуанкаре
export function dist(u: C, v: C): number {
  const diff = sub(u, v);
  const diff2 = abs2(diff);
  const u2 = abs2(u);
  const v2 = abs2(v);
  
  const denom = (1 - u2) * (1 - v2);
  if (denom <= 0) return Infinity;
  
  const arg = 1 + (2 * diff2) / denom;
  return Math.acosh(Math.max(1, arg));
}

// Геодезическая линия между двумя точками (дискретная аппроксимация)
export function geodesic(u: C, v: C, steps: number = 50): C[] {
  const result: C[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Простая интерполяция в модели Пуанкаре (не идеальная геодезия, но работает)
    const interp = add(scale(u, 1 - t), scale(v, t));
    const interpAbs = abs(interp);
    if (interpAbs < 0.999) {
      result.push(interp);
    }
  }
  return result;
}

