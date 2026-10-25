"use client";

import { useMemo } from "react";
import { CreditCard } from "@/components/ui/icons";
import { Card, EmptyState, SectionHeader } from "@/components/ui/Card";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { currentCompetencia, formatMoney } from "@/lib/format";
import { valoresEfetivosPorItem } from "@/lib/projection";
import { comprasPorCartao, usoDoLimite } from "@/lib/cartoes";
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
          // Visão geral: fatura do mês atual (mesmo paga) + faturas futuras
          // e parcelas -- essa aba não tem seletor de mês.
          const usado = usoDoLimite(c, compras.get(c.id), lancamentos, competencia, efetivos.get(c.id));
          const limite = c.limite ?? 0;
          const pct = limite > 0 ? Math.min(1, usado / limite) : 0;
          return { ...c, usado, pct, disponivel: limite - usado };
        })
        .sort((a, b) => b.pct - a.pct),
    [cartoes, efetivos, compras, lancamentos, competencia]
  );

  const limiteGeral = useMemo(() => linhas.reduce((s, c) => s + (c.limite ?? 0), 0), [linhas]);
  const usadoGeral = useMemo(() => linhas.reduce((s, c) => s + c.usado, 0), [linhas]);
  const pctGeral = limiteGeral > 0 ? Math.min(1, usadoGeral / limiteGeral) : 0;
  const disponivelGeral = limiteGeral - usadoGeral;

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
      <SummaryCard
        tone="grape"
        title="Limite disponível"
        value={formatMoney(disponivelGeral)}
        progress={pctGeral}
        progressLabel={`${Math.round(pctGeral * 100)}% do limite em uso · inclui faturas futuras`}
      >
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-white/15 pt-2">
          <div className="min-w-0">
            <dt className="text-[13px] font-medium text-white/75">Limite total</dt>
            <dd className="truncate text-[15px] font-semibold">{formatMoney(limiteGeral)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[13px] font-medium text-white/75">Total usado</dt>
            <dd className="truncate text-[15px] font-semibold">{formatMoney(usadoGeral)}</dd>
          </div>
        </dl>
      </SummaryCard>

      <section>
        <SectionHeader title="Por cartão" />
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
                        {c.limite
                          ? `Usado ${formatMoney(c.usado)} de ${formatMoney(c.limite)}`
                          : `Usado ${formatMoney(c.usado)} · limite não informado`}
                      </p>
                    </div>
                  </div>
                  {c.limite ? (
                    <p className="shrink-0 text-right">
                      <span
                        className={`block text-[15px] font-semibold ${c.disponivel < 0 ? "text-coral-500" : "text-ink-900"}`}
                      >
                        {formatMoney(c.disponivel)}
                      </span>
                      <span className="caption">disponível</span>
                    </p>
                  ) : (
                    <span className="shrink-0 text-[15px] font-semibold text-ink-400">—</span>
                  )}
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
