export function formatMoney(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);
}

// competencia é sempre "YYYY-MM-01". new Date(competencia) (string) seria
// interpretado como UTC e, em fusos negativos (ex: Brasil), voltaria pro
// mês anterior ao formatar em hora local -- por isso construímos a data
// com os componentes numéricos direto, sempre em horário local.
function competenciaToLocalDate(competencia: string): Date {
  const [year, month] = competencia.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

export function monthLabel(competencia: string): string {
  const date = competenciaToLocalDate(competencia);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date);
  return label.replace(".", "").replace(/^\w/, (c) => c.toUpperCase());
}

export function monthYearLabel(competencia: string): string {
  const date = competenciaToLocalDate(competencia);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
  return label.replace(/^\w/, (c) => c.toUpperCase());
}

// Mês a partir do qual o app passou a ter lançamentos de verdade (base
// zerada em out/2026). Meses anteriores não têm nenhum dado -- por isso
// o seletor de mês não deixa navegar pra antes dele.
export const MES_INICIAL = "2026-10-01";

export function currentCompetencia(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export function shiftCompetencia(competencia: string, delta: number): string {
  const [year, month] = competencia.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

// Valor enxuto (sem "R$" e sem centavos) pra caber em tabelas estreitas,
// como a grade item × mês do Semestre.
export function formatCompact(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(value ?? 0));
}
