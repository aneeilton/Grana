import { monthsBetween } from "@/lib/format";
import type { ValorEfetivo } from "@/lib/projection";
import type { Item, Lancamento } from "@/lib/types";

/** Compras (parceladas ou à vista) ligadas a cada cartão, por id do cartão. */
export function comprasPorCartao(items: Item[]): Map<string, Item[]> {
  const mapa = new Map<string, Item[]>();
  for (const i of items) {
    if (!i.cartao_id) continue;
    const lista = mapa.get(i.cartao_id);
    if (lista) lista.push(i);
    else mapa.set(i.cartao_id, [i]);
  }
  return mapa;
}

/** Soma das compras do cartão que caem na fatura da competência. */
export function totalComprasNoMes(compras: Item[] | undefined, efetivos: Map<string, ValorEfetivo>): number {
  return (compras ?? []).reduce((s, c) => s + (efetivos.get(c.id)?.valor ?? 0), 0);
}

/**
 * Parcelas ainda não pagas das compras do cartão, do mês informado em
 * diante -- é o que segue "prendendo" o limite do cartão.
 */
export function comprasAVencer(compras: Item[] | undefined, lancamentos: Lancamento[], aPartirDe: string): number {
  const ids = new Set((compras ?? []).map((c) => c.id));
  return lancamentos
    .filter((l) => ids.has(l.item_id) && !l.pago && l.competencia >= aPartirDe)
    .reduce((s, l) => s + Number(l.valor), 0);
}

/** Primeiro mês do plano de parcelas (competencia_unica, ou o 1º lançamento). */
export function inicioDoPlano(item: Item, lancamentos: Lancamento[]): string | null {
  if (item.competencia_unica) return item.competencia_unica;
  const meses = lancamentos.filter((l) => l.item_id === item.id).map((l) => l.competencia).sort();
  return meses[0] ?? null;
}

/** "3/10" pra parcela da competência, ou null fora do plano / item sem parcelas. */
export function rotuloParcela(item: Item, lancamentos: Lancamento[], competencia: string): string | null {
  if (!item.parcelas_total) return null;
  const inicio = inicioDoPlano(item, lancamentos);
  if (!inicio) return null;
  const n = monthsBetween(inicio, competencia) + 1;
  if (n < 1 || n > item.parcelas_total) return null;
  return `${n}/${item.parcelas_total}`;
}
