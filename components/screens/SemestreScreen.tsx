"use client";

import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange } from "lucide-react";
import { TopHeader } from "@/components/TopHeader";
import { Card } from "@/components/ui/Card";
import { SemestreGrid } from "@/components/screens/SemestreGrid";
import { buildMonthlyProjection } from "@/lib/projection";
import { formatMoney, monthLabel } from "@/lib/format";
import type { GastoDiario, Item, Lancamento } from "@/lib/types";

export function SemestreScreen({
  items,
  lancamentos,
  gastosDiarios,
  saldoAtual,
}: {
  items: Item[];
  lancamentos: Lancamento[];
  gastosDiarios: GastoDiario[];
  saldoAtual: number;
}) {
  const series = useMemo(
    () =>
      buildMonthlyProjection({
        saldoBase: saldoAtual,
        items,
        lancamentos,
        gastosDiarios,
        monthsBefore: 0,
        monthsAfter: 5,
      }),
    [saldoAtual, items, lancamentos, gastosDiarios]
  );

  const receitaTotal = series.reduce((s, m) => s + m.receitaTotal, 0);
  const despesaTotal = series.reduce((s, m) => s + m.despesaTotal, 0);
  const fechamentoFinal = series[series.length - 1]?.saldoFinal ?? saldoAtual;

  const chartData = series.map((s) => ({
    name: monthLabel(s.competencia).slice(0, 3),
    saldo: s.saldoFinal,
  }));

  return (
    <div>
      <TopHeader icon={CalendarRange} title="Semestre" subtitle="Próximos 6 meses" />

      <div className="space-y-4 px-4 pt-1">
        <Card className="bg-gradient-to-br from-grape-500 to-grape-900 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Saldo previsto em {monthLabel(series[series.length - 1]?.competencia ?? "")}
          </p>
          <p className="mt-1 text-3xl font-extrabold [font-variant-numeric:tabular-nums]">
            {formatMoney(fechamentoFinal)}
          </p>
          <p className="mt-1 text-xs text-white/70">
            A partir do saldo atual de {formatMoney(saldoAtual)}
          </p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-brand-50 text-brand-700">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
              Receitas previstas
            </p>
            <p className="text-lg font-extrabold">{formatMoney(receitaTotal)}</p>
          </Card>
          <Card className="bg-coral-500/10 text-coral-500">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
              Despesas previstas
            </p>
            <p className="text-lg font-extrabold">{formatMoney(despesaTotal)}</p>
          </Card>
        </div>

        <Card>
          <p className="mb-2 text-sm font-bold text-ink-800">Saldo previsto por mês</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#8B9995" }}
                />
                <YAxis hide />
                <Tooltip formatter={(value: number) => formatMoney(value)} />
                <Bar dataKey="saldo" radius={[8, 8, 8, 8]} fill="#8E20B6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <SemestreGrid items={items} lancamentos={lancamentos} series={series} />
      </div>
    </div>
  );
}
