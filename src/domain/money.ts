// Regra única de dinheiro do Opticore (F1-09 — issue #17).
// Documentação: docs/architecture/DATA_MODEL_PLAN.md → "Regra de dinheiro".
//
// 1. Fronteira de entrada/saída: reais (number), sempre finitos.
// 2. Cálculo: centavos inteiros (toCents) — nenhuma soma diretamente em reais.
// 3. Arredondamento: Math.round (meio para cima) aplicado na fronteira
//    (linha de venda / orçamento), depois só soma inteira de centavos.
// 4. NaN e Infinity nunca persistem: requireMoney lança na fronteira do serviço.

export function isMoney(value: number): boolean {
  return Number.isFinite(value);
}

export function requireMoney(value: number, message: string): number {
  if (!Number.isFinite(value)) throw new Error(message);
  return value;
}

export function toCents(value: number): number {
  return Math.round(requireMoney(value, "Valor monetário inválido.") * 100);
}

export function fromCents(cents: number): number {
  if (!Number.isFinite(cents) || !Number.isInteger(cents)) throw new Error("Centavos inválidos.");
  return cents / 100;
}

export function roundMoney(value: number): number {
  return fromCents(toCents(value));
}
