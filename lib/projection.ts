import { currentCompetencia, shiftCompetencia } from "@/lib/format";
import type { GastoDiario, Item, Lancamento } from "@/lib/types";

export type MonthProjection = {
  competencia: string;
  receitaTotal: number;
  despesaTotal: number;
  despesaFixa: number;
  despesaPontual: number;
  receitaPendente: number;
  despesaPendente: number;
  gastosDiarios: number;
  saldoInicial: number;
  saldoFinal: number;
  isCurrent: boolean;
};

export type ValorEfetivo = { valor: number; pago: boolean; inferido: boolean };

/** Item anual/sazonal: repete só nos meses do ano em meses_recorrencia. */
export function ehSazonal(item: Item): boolean {
  return !item.fixo && !!item.meses_recorrencia?.length;
}

/** O item sazonal ocorre no mês dessa competência? */
export function ocorreNoMes(item: Item, competencia: string): boolean {
  return ehSazonal(item) && item.meses_recorrencia!.includes(Number(competencia.slice(5, 7)));
}

/**
 * Agrupa os lancamentos de cada item em ordem cronologica -- base para
 * "puxar" o valor de um item fixo pra frente (ver lancamentoEfetivo).
 */
function agruparPorItem(itemIds: Set<string>, lancamentos: Lancamento[]): Map<string, Lancamento[]> {
  const porItem = new Map<string, Lancamento[]>();
  for (const l of lancamentos) {
    if (!itemIds.has(l.item_id)) continue;
    const lista = porItem.get(l.item_id);
    if (lista) lista.push(l);
    else porItem.set(l.item_id, [l]);
  }
  for (const lista of porItem.values()) {
    lista.sort((a, b) => a.competencia.localeCompare(b.competencia));
  }
  return porItem;
}

/**
 * Valor "vigente" de um item numa competencia: o lancamento explicito
 * dessa competencia ou, pra item fixo sem lancamento no mes, o ultimo
 * lancamento explicito anterior a ela (o valor continua o mesmo ate
 * alguem lancar um valor diferente nesse mes). Sem isso, tanto a
 * projecao quanto a tela de edicao mostravam um item fixo como zerado
 * em qualquer mes sem lancamento proprio, mesmo sendo recorrente.
 */
function lancamentoEfetivo(
  item: Item,
  competencia: string,
  listaDoItem: Lancamento[] | undefined
): ValorEfetivo | null {
  if (!listaDoItem?.length) return null;
  const exato = listaDoItem.find((l) => l.competencia === competencia);
  if (exato) return { valor: Number(exato.valor), pago: exato.pago, inferido: false };
  // Anual/sazonal: só "puxa" o último valor nos meses do ano em que ocorre.
  if (ehSazonal(item)) {
    if (!item.meses_recorrencia!.includes(Number(competencia.slice(5, 7)))) return null;
  } else if (!item.fixo) return null;
  let anterior: Lancamento | null = null;
  for (const l of listaDoItem) {
    if (l.competencia < competencia) anterior = l;
    else break;
  }
  return anterior ? { valor: Number(anterior.valor), pago: false, inferido: true } : null;
}

/**
 * Valor efetivo de cada item numa competencia -- usado pelas telas de
 * edicao (Fluxo) pra pre-preencher itens fixos com o valor do ultimo
 * mes lancado, em vez de mostrar zerado ate alguem digitar de novo.
 */
export function valoresEfetivosPorItem(
  items: Item[],
  lancamentos: Lancamento[],
  competencia: string
): Map<string, ValorEfetivo> {
  const porItem = agruparPorItem(new Set(items.map((i) => i.id)), lancamentos);
  const resultado = new Map<string, ValorEfetivo>();
  for (const item of items) {
    const efetivo = lancamentoEfetivo(item, competencia, porItem.get(item.id));
    if (efetivo) resultado.set(item.id, efetivo);
  }
  return resultado;
}

/**
 * Projeta o saldo mes a mes a partir do saldo real das contas hoje
 * (saldoBase). O mes atual e a ancora: saldo inicial dele = saldoBase.
 * Meses futuros encadeiam a partir do fechamento do mes anterior (o que
 * ainda vai acontecer). Meses passados sao calculados isoladamente a
 * partir do saldoBase (nao encadeados "pra tras"), ja que nao temos o
 * saldo real historico -- na pratica tendem a ficar perto do saldoBase
 * porque contas passadas ja estao maioria paga/recebida.
 */
export function buildMonthlyProjection({
  saldoBase,
  items,
  lancamentos,
  gastosDiarios,
  monthsBefore,
  monthsAfter,
}: {
  saldoBase: number;
  items: Item[];
  lancamentos: Lancamento[];
  gastosDiarios: GastoDiario[];
  monthsBefore: number;
  monthsAfter: number;
}): MonthProjection[] {
  const current = currentCompetencia();
  const porItem = agruparPorItem(new Set(items.map((i) => i.id)), lancamentos);

  const gastosPorMes = new Map<string, number>();
  for (const g of gastosDiarios) {
    const mes = `${g.data.slice(0, 7)}-01`;
    gastosPorMes.set(mes, (gastosPorMes.get(mes) ?? 0) + Number(g.valor));
  }

  function dadosDoMes(competencia: string) {
    let receitaTotal = 0;
    let despesaFixa = 0;
    let despesaPontual = 0;
    let receitaPendente = 0;
    let despesaPendente = 0;

    for (const item of items) {
      const efetivo = lancamentoEfetivo(item, competencia, porItem.get(item.id));
      if (!efetivo) continue;
      if (item.tipo === "receita") {
        receitaTotal += efetivo.valor;
        if (!efetivo.pago) receitaPendente += efetivo.valor;
      } else {
        if (item.fixo) despesaFixa += efetivo.valor;
        else despesaPontual += efetivo.valor;
        if (!efetivo.pago) despesaPendente += efetivo.valor;
      }
    }

    const gastos = gastosPorMes.get(competencia) ?? 0;
    return {
      receitaTotal,
      despesaFixa,
      despesaPontual,
      despesaTotal: despesaFixa + despesaPontual + gastos,
      receitaPendente,
      despesaPendente: despesaPendente + gastos,
      gastosDiarios: gastos,
    };
  }

  const porCompetencia = new Map<string, MonthProjection>();

  // meses passados: cada um calculado isoladamente a partir do saldoBase
  for (let i = 1; i <= monthsBefore; i++) {
    const competencia = shiftCompetencia(current, -i);
    const dados = dadosDoMes(competencia);
    const saldoFinal = saldoBase + dados.receitaPendente - dados.despesaPendente;
    porCompetencia.set(competencia, {
      competencia,
      ...dados,
      saldoInicial: saldoBase,
      saldoFinal,
      isCurrent: false,
    });
  }

  // mes atual + meses futuros: encadeados a partir do saldoBase
  let saldo = saldoBase;
  for (let i = 0; i <= monthsAfter; i++) {
    const competencia = shiftCompetencia(current, i);
    const dados = dadosDoMes(competencia);
    const saldoInicial = saldo;
    const saldoFinal = saldoInicial + dados.receitaPendente - dados.despesaPendente;
    porCompetencia.set(competencia, {
      competencia,
      ...dados,
      saldoInicial,
      saldoFinal,
      isCurrent: competencia === current,
    });
    saldo = saldoFinal;
  }

  return Array.from(porCompetencia.values()).sort((a, b) => a.competencia.localeCompare(b.competencia));
}

/**
 * Mês mais apertado de uma janela de projeção: o de menor saldo no fim
 * do mês. Retorna null pra lista vazia.
 */
export function mesCritico(series: MonthProjection[]): MonthProjection | null {
  return series.reduce<MonthProjection | null>(
    (pior, m) => (pior === null || m.saldoFinal < pior.saldoFinal ? m : pior),
    null
  );
}
