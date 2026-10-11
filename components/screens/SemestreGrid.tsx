"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { valoresEfetivosPorItem, type MonthProjection } from "@/lib/projection";
import { formatCompact, monthLabel } from "@/lib/format";
import type { Item, Lancamento } from "@/lib/types";

type Linha = { id: string; nome: string; detalhe?: string; valores: (number | null)[] };

function detalheDoItem(item: Item, nomeCartao?: string): string | undefined {
  if (nomeCartao) return item.parcelas_total ? `${item.parcelas_total}x · ${nomeCartao}` : nomeCartao;
  if (item.meses_recorrencia?.length && !item.fixo) return item.meses_recorrencia.length === 1 ? "anual" : "sazonal";
  if (item.cartao) return "cartão";
  if (item.parcelas_total) return `${item.parcelas_total}x`;
  if (!item.fixo) return "pontual";
  return undefined;
}

/**
 * Grade item × mês dos próximos 6 meses: cada linha é um item (receita
 * ou despesa) e cada coluna um mês, com o valor efetivo daquele mês
 * (lançado ou herdado do último mês, no caso de item fixo). Itens sem
 * valor em nenhum dos meses ficam de fora.
 */
export function SemestreGrid({
  items,
  lancamentos,
  series,
  criticoCompetencia,
}: {
  items: Item[];
  lancamentos: Lancamento[];
  series: MonthProjection[];
  criticoCompetencia: string | null;
}) {
  const { receitas, despesas } = useMemo(() => {
    const nomes = new Map(items.map((i) => [i.id, i.nome]));
    const porMes = series.map((m) => valoresEfetivosPorItem(items, lancamentos, m.competencia));
    const linhas = (tipo: Item["tipo"]): Linha[] =>
      items
        .filter((i) => i.tipo === tipo)
        .map((item) => ({
          id: item.id,
          nome: item.nome,
          detalhe: detalheDoItem(item, item.cartao_id ? nomes.get(item.cartao_id) : undefined),
          valores: porMes.map((mapa) => mapa.get(item.id)?.valor ?? null),
        }))
        .filter((l) => l.valores.some((v) => v))
        .sort((a, b) => {
          const total = (l: Linha) => l.valores.reduce<number>((s, v) => s + (v ?? 0), 0);
          return total(b) - total(a);
        });
    return { receitas: linhas("receita"), despesas: linhas("despesa") };
  }, [items, lancamentos, series]);

  const temGastos = series.some((m) => m.gastosDiarios > 0);

  const celula = "px-2 py-1.5 text-right [font-variant-numeric:tabular-nums] whitespace-nowrap";
  const nomeCol = "sticky left-0 z-10 px-2 py-1.5 text-left";

  function linhaItem(l: Linha) {
    return (
      <tr key={l.id} className="border-t border-ink-100">
        <td className={`${nomeCol} max-w-[8.5rem] bg-white`}>
          <p className="truncate font-semibold text-ink-800">{l.nome}</p>
          {l.detalhe && <p className="text-[10px] text-ink-400">{l.detalhe}</p>}
        </td>
        {l.valores.map((v, i) => (
          <td key={i} className={`${celula} ${v ? "text-ink-700" : "text-ink-400/50"}`}>
            {v ? formatCompact(v) : "—"}
          </td>
        ))}
      </tr>
    );
  }

  function linhaTotal(rotulo: string, valores: number[], tom: string, destaque = false) {
    return (
      <tr className={`border-t border-ink-100 ${destaque ? "bg-ink-50" : ""}`}>
        <td className={`${nomeCol} font-bold ${tom} ${destaque ? "bg-ink-50" : "bg-white"}`}>{rotulo}</td>
        {valores.map((v, i) => (
          <td key={i} className={`${celula} font-bold ${v < 0 ? "text-coral-500" : tom}`}>
            {formatCompact(v)}
          </td>
        ))}
      </tr>
    );
  }

  function cabecalhoGrupo(rotulo: string, tom: string) {
    return (
      <tr>
        <td
          colSpan={series.length + 1}
          className={`sticky left-0 px-2 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide ${tom}`}
        >
          {rotulo}
        </td>
      </tr>
    );
  }

  return (
    <Card className="px-0 pb-2">
      <div className="mb-1 px-4">
        <p className="text-sm font-bold text-ink-800">Item a item</p>
        <p className="text-[11px] text-ink-400">Valores em R$ · arraste para o lado para ver todos os meses</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className={`${nomeCol} bg-white text-[11px] font-semibold text-ink-400`}>Item</th>
              {series.map((m) => (
                <th
                  key={m.competencia}
                  className={`${celula} text-[11px] font-semibold ${
                    m.competencia === criticoCompetencia
                      ? "text-coral-500"
                      : m.isCurrent
                        ? "text-brand-700"
                        : "text-ink-400"
                  }`}
                >
                  {monthLabel(m.competencia)}
                  {m.competencia === criticoCompetencia && (
                    <span className="block text-[9px] font-bold uppercase">menor saldo</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cabecalhoGrupo("Receitas", "text-brand-700")}
            {receitas.length ? receitas.map(linhaItem) : (
              <tr><td colSpan={series.length + 1} className="px-2 py-1.5 text-ink-400">Nenhuma receita prevista</td></tr>
            )}
            {linhaTotal("Total receitas", series.map((m) => m.receitaTotal), "text-brand-700")}

            {cabecalhoGrupo("Despesas", "text-coral-500")}
            {despesas.map(linhaItem)}
            {temGastos && (
              <tr className="border-t border-ink-100">
                <td className={`${nomeCol} bg-white`}>
                  <p className="font-semibold text-ink-800">Dia a dia</p>
                  <p className="text-[10px] text-ink-400">gastos lançados</p>
                </td>
                {series.map((m) => (
                  <td key={m.competencia} className={`${celula} ${m.gastosDiarios ? "text-ink-700" : "text-ink-400/50"}`}>
                    {m.gastosDiarios ? formatCompact(m.gastosDiarios) : "—"}
                  </td>
                ))}
              </tr>
            )}
            {!despesas.length && !temGastos && (
              <tr><td colSpan={series.length + 1} className="px-2 py-1.5 text-ink-400">Nenhuma despesa prevista</td></tr>
            )}
            {linhaTotal("Total despesas", series.map((m) => m.despesaTotal), "text-coral-500")}

            <tr><td colSpan={series.length + 1} className="h-2" /></tr>
            {linhaTotal("Resultado do mês", series.map((m) => m.receitaTotal - m.despesaTotal), "text-ink-800", true)}
            {linhaTotal("Saldo no fim do mês", series.map((m) => m.saldoFinal), "text-ink-800", true)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
