"use client";

import { useMemo } from "react";
import { CreditCard } from "@/components/ui/icons";
import { Card, EmptyState, SectionHeader } from "@/components/ui/Card";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { currentCompetencia, formatMoney } from "@/lib/format";
import { valoresEfetivosPorItem } from "@/lib/projection";
import { comprasPorCartao, saldoDevedorCartao } from "@/lib/cartoes";
import type { Item, Lancamento } from "@/lib/types";

function usoCor(pct: number) {
  return pct >= 0.9 ? "bg-coral-500" : pct >= 0.7 ? "bg-sun-400" : "bg-grape-600";
}

export function CartoesScreen({ items, lancamentos }: { items: Item[]; lancamentos: Lancamento[] }) {
  const cartoes = useMemo(() => items.filter((i) => i.cartao), [items]);

  // Sempre o mes atual de verdade -- essa tela e um resumo geral, nao um
  // extrato navegavel por competencia.
  const competencia = useMemo(() => currentCompetencia(), []);
  const compras = useMemo(() => comprasPorCartao(items), [items]);
  const efetivos = useMemo(
    () => valoresEfetivosPorItem(items, lancamentos, competencia),
    [items, lancamentos, competencia]
  );

  const linhas = useMemo(
    () =>
      cartoes
        .map((c) => {
          // Saldo devedor total (todos os meses em aberto, inclusive parcelas
          // e faturas futuras) -- essa aba não tem seletor de mês.
          const usado = saldoDevedorCartao(c, compras.get(c.id), lancamentos, competencia, efetivos.get(c.id));
          const limite = c.limite ?? 0;
          const pct = limite > 0 ? Math.min(1, usado / limite) : 0;
          return { ...c, usado, pct };
        })
        .sort((a, b) => b.pct - a.pct),
    [cartoes, efetivos, compras, lancamentos, competencia]
  );

  const limiteGeral = useMemo(() => linhas.reduce((s, c) => s + (c.limite ?? 0), 0), [linhas]);
  const usadoGeral = useMemo(() => linhas.reduce((s, c) => s + c.usado, 0), [linhas]);
  const pctGeral = limiteGeral > 0 ? Math.min(1, usadoGeral / limiteGeral) : 0;

  if (cartoes.length === 0) {
    return (
      <div className="px-4">
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          hint='Adicione um cartão na aba "Despesas" marcando "É um cartão de crédito"'
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4">
      {/* Saldo devedor = tudo em aberto do cartão (fatura atual, parcelas e
          faturas futuras já lançadas) -- o mesmo "usado" do limite. */}
      <SummaryCard
        tone="grape"
        title="Limite geral"
        value={formatMoney(limiteGeral)}
        progress={pctGeral}
        progressLabel={`${formatMoney(usadoGeral)} usados · ${Math.round(pctGeral * 100)}%`}
        rowsTitle="Saldo devedor por cartão (inclui parcelas futuras)"
        rows={[...linhas]
          .sort((a, b) => b.usado - a.usado)
          .map((c) => ({ id: c.id, label: c.nome, value: formatMoney(c.usado), muted: c.usado === 0 }))}
        totalLabel="Total devedor"
        totalValue={formatMoney(usadoGeral)}
      />

      <section>
        <SectionHeader title="Uso do limite" />
        <Card className="p-0">
          <ul className="divide-y divide-ink-100">
            {linhas.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="app-icon bg-grape-400">
                      <CreditCard size={18} weight="fill" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-ink-900">{c.nome}</p>
                      <p className="caption">
                        {formatMoney(c.usado)} de {c.limite ? formatMoney(c.limite) : "limite não informado"}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[15px] font-semibold text-ink-900">
                    {c.limite ? `${Math.round(c.pct * 100)}%` : "—"}
                  </span>
                </div>
                {c.limite ? (
                  <div
                    className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
                    role="progressbar"
                    aria-label={`Uso do limite de ${c.nome}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(c.pct * 100)}
                  >
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ease-out-expo ${usoCor(c.pct)}`}
                      style={{ width: `${c.pct * 100}%` }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
