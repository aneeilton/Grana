"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, TriangleAlert } from "lucide-react";
import { TopHeader } from "@/components/TopHeader";
import { Card } from "@/components/ui/Card";
import { SemestreGrid } from "@/components/screens/SemestreGrid";
import { SimuladorCard } from "@/components/screens/SimuladorCard";
import { buildMonthlyProjection, mesCritico } from "@/lib/projection";
import { formatMoney, monthLabel, monthYearLabel } from "@/lib/format";
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
  const critico = mesCritico(series);
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

        {critico && (
          <Card
            className={`flex items-start gap-3 ${
              critico.saldoFinal < 0 ? "bg-coral-500/10 text-coral-500" : "bg-sun-500/10 text-sun-500"
            }`}
          >
            <TriangleAlert size={18} strokeWidth={2.25} className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold">Mês mais apertado: {monthYearLabel(critico.competencia)}</p>
              <p className="text-[11px] text-ink-500">
                {critico.saldoFinal < 0
                  ? `Fecha no vermelho, com ${formatMoney(critico.saldoFinal)}. É o mês para se planejar primeiro.`
                  : `Menor saldo previsto do semestre: ${formatMoney(critico.saldoFinal)} no fim do mês.`}
              </p>
            </div>
          </Card>
        )}

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
                <Bar dataKey="saldo" radius={[8, 8, 8, 8]}>
                  {series.map((s) => (
                    <Cell
                      key={s.competencia}
                      fill={s.competencia === critico?.competencia ? (s.saldoFinal < 0 ? "#E91644" : "#FFD23F") : "#8E20B6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <SimuladorCard items={items} lancamentos={lancamentos} series={series} />

        <SemestreGrid
          items={items}
          lancamentos={lancamentos}
          series={series}
          criticoCompetencia={critico?.competencia ?? null}
        />
      </div>
    </div>
  );
}
