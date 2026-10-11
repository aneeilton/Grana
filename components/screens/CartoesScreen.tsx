"use client";

import { useMemo } from "react";
import { CreditCard } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/Card";
import { currentCompetencia, formatMoney } from "@/lib/format";
import { valoresEfetivosPorItem } from "@/lib/projection";
import { comprasAVencer, comprasPorCartao, totalComprasNoMes } from "@/lib/cartoes";
import type { Item, Lancamento } from "@/lib/types";

function usoCor(pct: number) {
  return pct >= 0.9 ? "bg-coral-500" : pct >= 0.7 ? "bg-sun-500" : "bg-brand-600";
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
          // Fatura do mês = gastos avulsos + parcelas deste mês. Limite usado
          // soma também as parcelas futuras ainda não pagas.
          const avulsos = efetivos.get(c.id)?.valor ?? 0;
          const valor = avulsos + totalComprasNoMes(compras.get(c.id), efetivos);
          // fatura já paga libera o limite e não é mais dívida
          const avulsosEmAberto = efetivos.get(c.id)?.pago ? 0 : avulsos;
          const usado = avulsosEmAberto + comprasAVencer(compras.get(c.id), lancamentos, competencia);
          const limite = c.limite ?? 0;
          const pct = limite > 0 ? Math.min(1, usado / limite) : 0;
          return { ...c, valor, usado, pct };
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
    <div className="space-y-4 px-4">
      <Card className="bg-gradient-to-br from-grape-600 to-grape-900 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Limite geral</p>
        <p className="mt-1 text-3xl font-extrabold [font-variant-numeric:tabular-nums]">{formatMoney(limiteGeral)}</p>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div className={`h-full rounded-full ${usoCor(pctGeral)}`} style={{ width: `${pctGeral * 100}%` }} />
        </div>
        <p className="mt-2 text-sm font-semibold text-white/90">
          {formatMoney(usadoGeral)} usados · {Math.round(pctGeral * 100)}%
        </p>

        {/* Saldo devedor = fatura deste mês ainda em aberto + parcelas
            futuras não pagas (o mesmo "usado" do limite de cada cartão). */}
        <div className="mt-4 border-t border-white/15 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
            Saldo devedor por cartão
          </p>
          <div className="mt-1.5 space-y-1.5">
            {[...linhas]
              .sort((a, b) => b.usado - a.usado)
              .map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-white/90">{c.nome}</span>
                  <span className="shrink-0 font-bold [font-variant-numeric:tabular-nums]">
                    {formatMoney(c.usado)}
                  </span>
                </div>
              ))}
            <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-1.5 text-sm">
              <span className="font-semibold text-white/80">Total devedor</span>
              <span className="shrink-0 font-extrabold [font-variant-numeric:tabular-nums]">
                {formatMoney(usadoGeral)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-2">
        <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">Por cartão</p>
        {linhas.map((c) => (
          <Card key={c.id}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-grape-500/10 text-grape-500">
                  <CreditCard size={16} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-800">{c.nome}</p>
                  <p className="text-xs text-ink-400">
                    {formatMoney(c.usado)} de {formatMoney(c.limite ?? 0)} · fatura do mês {formatMoney(c.valor)}
                  </p>
                </div>
              </div>
              <span className="shrink-0 text-sm font-bold text-ink-700">{Math.round(c.pct * 100)}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div className={`h-full rounded-full ${usoCor(c.pct)}`} style={{ width: `${c.pct * 100}%` }} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
