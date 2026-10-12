"use client";

import { useMemo, useState } from "react";
import { FlaskConical, RotateCcw } from "@/components/ui/icons";
import { Card } from "@/components/ui/Card";
import { mesCritico, valoresEfetivosPorItem, type MonthProjection } from "@/lib/projection";
import { formatMoney, monthLabel, monthYearLabel } from "@/lib/format";
import type { Item, Lancamento } from "@/lib/types";

/**
 * Simulador "e se": corta despesas inteiras, reduz gastos em geral ou a
 * receita mensal, e mostra como fica o saldo no fim de cada mês dos
 * próximos 6 meses. Rudimentar de propósito: só desloca a projeção já
 * calculada pela diferença acumulada mês a mês -- não grava nada.
 */
export function SimuladorCard({
  items,
  lancamentos,
  series,
}: {
  items: Item[];
  lancamentos: Lancamento[];
  series: MonthProjection[];
}) {
  const [cortados, setCortados] = useState<Set<string>>(new Set());
  const [menosGastos, setMenosGastos] = useState("");
  const [menosReceita, setMenosReceita] = useState("");

  // Valor de cada item em cada mês da janela, só o que ainda está
  // pendente (o que já foi pago não dá mais pra cortar).
  const pendentesPorMes = useMemo(
    () =>
      series.map((m) => {
        const efetivos = valoresEfetivosPorItem(items, lancamentos, m.competencia);
        const pendentes = new Map<string, number>();
        for (const [id, e] of efetivos) if (!e.pago) pendentes.set(id, e.valor);
        return pendentes;
      }),
    [items, lancamentos, series]
  );

  // Despesas que dá pra cortar: as que têm valor pendente na janela,
  // ordenadas pelo peso total no semestre. Compras de cartão entram
  // separadas da fatura (dá pra simular cortar só a parcela).
  const opcoes = useMemo(
    () =>
      items
        .filter((i) => i.tipo === "despesa")
        .map((i) => ({
          item: i,
          total: pendentesPorMes.reduce((s, mapa) => s + (mapa.get(i.id) ?? 0), 0),
        }))
        .filter((o) => o.total > 0)
        .sort((a, b) => b.total - a.total),
    [items, pendentesPorMes]
  );

  const corteGastos = Math.max(0, Number(menosGastos || 0));
  const corteReceita = Math.max(0, Number(menosReceita || 0));
  const ativo = cortados.size > 0 || corteGastos > 0 || corteReceita > 0;

  const simulado = useMemo(() => {
    let acumulado = 0;
    return series.map((m, idx) => {
      let delta = corteGastos - corteReceita;
      for (const id of cortados) delta += pendentesPorMes[idx].get(id) ?? 0;
      acumulado += delta;
      return { ...m, saldoFinal: m.saldoFinal + acumulado, diferenca: acumulado };
    });
  }, [series, cortados, corteGastos, corteReceita, pendentesPorMes]);

  const criticoAtual = mesCritico(series);
  const criticoSimulado = mesCritico(simulado);
  const ultimo = simulado[simulado.length - 1];

  function alternar(id: string) {
    setCortados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function limpar() {
    setCortados(new Set());
    setMenosGastos("");
    setMenosReceita("");
  }

  const inputCls =
    "field";

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="app-icon bg-grape-400">
            <FlaskConical size={18} weight="fill" aria-hidden />
          </span>
          <div>
            <p className="text-[17px] font-semibold text-ink-900">E se…?</p>
            <p className="caption">Simulação, não altera seus lançamentos</p>
          </div>
        </div>
        {ativo && (
          <button onClick={limpar} className="btn -my-1.5 min-h-10 px-3 text-[13px] text-ink-700 hover:bg-ink-100">
            <RotateCcw size={13} strokeWidth={2.5} />
            Limpar
          </button>
        )}
      </div>

      {opcoes.length > 0 && (
        <div className="mt-3">
          <p className="px-1 text-[11px] font-semibold text-ink-500">Cortar despesas (toque para tirar)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {opcoes.map(({ item, total }) => {
              const on = cortados.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => alternar(item.id)}
                  className={`inline-flex min-h-9 items-center rounded-full px-3 text-[13px] font-medium transition active:scale-95 ${
                    on ? "bg-coral-500 text-white line-through" : "bg-ink-100 text-ink-700"
                  }`}
                >
                  {item.nome} · {formatMoney(total / series.length)}/mês
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="px-1 text-[11px] font-semibold text-ink-500">Gastar menos (R$/mês)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            placeholder="0,00"
            value={menosGastos}
            onChange={(e) => setMenosGastos(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block space-y-1">
          <span className="px-1 text-[11px] font-semibold text-ink-500">Receber menos (R$/mês)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            placeholder="0,00"
            value={menosReceita}
            onChange={(e) => setMenosReceita(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>

      {ativo && ultimo && (
        <div className="mt-4 space-y-3">
          <div className={`rounded-2xl p-3 ${ultimo.diferenca >= 0 ? "bg-brand-50" : "bg-coral-500/10"}`}>
            <p className="text-[11px] font-semibold text-ink-500">
              Saldo em {monthYearLabel(ultimo.competencia)}
            </p>
            <p
              className={`text-xl font-bold ${
                ultimo.saldoFinal >= 0 ? "text-ink-800" : "text-coral-500"
              }`}
            >
              {formatMoney(ultimo.saldoFinal)}
            </p>
            <p className={`text-[13px] font-semibold ${ultimo.diferenca >= 0 ? "text-brand-700" : "text-coral-500"}`}>
              {ultimo.diferenca >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(ultimo.diferenca))} em relação ao previsto
            </p>
            {criticoSimulado && criticoAtual && (
              <p className="mt-1 text-[11px] text-ink-500">
                {criticoSimulado.saldoFinal < 0
                  ? `Ainda fica negativo em ${monthYearLabel(criticoSimulado.competencia)} (${formatMoney(criticoSimulado.saldoFinal)}).`
                  : criticoAtual.saldoFinal < 0
                    ? `Nenhum mês fica mais no vermelho. O mais apertado vira ${monthYearLabel(criticoSimulado.competencia)}, com ${formatMoney(criticoSimulado.saldoFinal)}.`
                    : `Mês mais apertado: ${monthYearLabel(criticoSimulado.competencia)}, com ${formatMoney(criticoSimulado.saldoFinal)}.`}
              </p>
            )}
          </div>

          <table className="w-full text-xs">
            <thead>
              <tr className="caption">
                <th className="py-1 text-left font-semibold">Mês</th>
                <th className="py-1 text-right font-semibold">Previsto</th>
                <th className="py-1 text-right font-semibold">Simulado</th>
              </tr>
            </thead>
            <tbody className="">
              {simulado.map((m, idx) => (
                <tr key={m.competencia} className="border-t border-ink-100">
                  <td className="py-1.5 font-semibold text-ink-700">{monthLabel(m.competencia)}</td>
                  <td className={`py-1.5 text-right ${series[idx].saldoFinal < 0 ? "text-coral-500" : "text-ink-500"}`}>
                    {formatMoney(series[idx].saldoFinal)}
                  </td>
                  <td className={`py-1.5 text-right font-bold ${m.saldoFinal < 0 ? "text-coral-500" : "text-ink-800"}`}>
                    {formatMoney(m.saldoFinal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
