"use client";

import { useMemo } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarRange, TriangleAlert } from "lucide-react";
import { TopHeader } from "@/components/TopHeader";
import { Card, SectionHeader } from "@/components/ui/Card";
import { SummaryCard } from "@/components/ui/SummaryCard";
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

      <div className="space-y-6 px-4 pt-1">
        <SummaryCard
          tone="grape"
          title={`Saldo previsto em ${monthYearLabel(series[series.length - 1]?.competencia ?? "")}`}
          value={formatMoney(fechamentoFinal)}
          subtitle={`A partir do saldo atual de ${formatMoney(saldoAtual)}`}
        >
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
            <div className="min-w-0">
              <dt className="text-[13px] font-medium text-white/75">Receitas previstas</dt>
              <dd className="truncate text-[15px] font-semibold">{formatMoney(receitaTotal)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[13px] font-medium text-white/75">Despesas previstas</dt>
              <dd className="truncate text-[15px] font-semibold">{formatMoney(despesaTotal)}</dd>
            </div>
          </dl>
        </SummaryCard>

        {critico && (
          <div
            role={critico.saldoFinal < 0 ? "alert" : undefined}
            className={`flex items-start gap-3 rounded-2xl p-4 ${critico.saldoFinal < 0 ? "bg-coral-100" : "bg-sun-100"}`}
          >
            <TriangleAlert
              size={20}
              strokeWidth={2.25}
              className={`mt-0.5 shrink-0 ${critico.saldoFinal < 0 ? "text-coral-500" : "text-sun-500"}`}
              aria-hidden
            />
            <div className="min-w-0">
              <p className={`text-[15px] font-semibold ${critico.saldoFinal < 0 ? "text-coral-500" : "text-sun-500"}`}>
                Mês mais apertado: {monthYearLabel(critico.competencia)}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-700">
                {critico.saldoFinal < 0
                  ? `Fecha no vermelho, com ${formatMoney(critico.saldoFinal)}. É o mês para se planejar primeiro.`
                  : `Menor saldo previsto do semestre: ${formatMoney(critico.saldoFinal)} no fim do mês.`}
              </p>
            </div>
          </div>
        )}

        <section>
          <SectionHeader title="Saldo previsto por mês" />
          <Card>
            <div className="h-44" role="img" aria-label="Gráfico do saldo previsto no fim de cada mês do semestre">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#5F706C", fontFamily: "var(--font-sans)" }}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: "rgba(18, 25, 23, 0.04)", radius: 8 }}
                    formatter={(value: number) => [formatMoney(value), "Saldo"]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "none",
                      boxShadow: "0 6px 18px -10px rgba(18,25,23,0.3)",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="saldo" radius={[8, 8, 8, 8]} maxBarSize={36}>
                    {series.map((s) => (
                      <Cell
                        key={s.competencia}
                        fill={
                          s.competencia === critico?.competencia
                            ? s.saldoFinal < 0
                              ? "#E91644"
                              : "#E8B500"
                            : "#8E20B6"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {critico && (
              <p className="caption mt-2 flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`h-2 w-2 rounded-full ${critico.saldoFinal < 0 ? "bg-coral-500" : "bg-[#E8B500]"}`}
                />
                Mês mais apertado em destaque
              </p>
            )}
          </Card>
        </section>

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
