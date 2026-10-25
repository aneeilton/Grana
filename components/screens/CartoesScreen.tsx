"use client";

import { useMemo, useState } from "react";
import { CreditCard, Pencil } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState, SectionHeader } from "@/components/ui/Card";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { currentCompetencia, formatMoney } from "@/lib/format";
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

  const linhas = useMemo(
    () =>
      cartoes
        .map((c) => {
          // Em uso = tudo que falta pagar (fatura atual, futuras e parcelas);
          // pago libera o limite. Essa aba não tem seletor de mês.
          const usado = saldoDevedorCartao(c, compras.get(c.id), lancamentos, competencia);
          const limite = c.limite ?? 0;
          const pct = limite > 0 ? Math.min(1, usado / limite) : 0;
          return { ...c, usado, pct, disponivel: limite - usado };
        })
        .sort((a, b) => b.pct - a.pct),
    [cartoes, compras, lancamentos, competencia]
  );

  const limiteGeral = useMemo(() => linhas.reduce((s, c) => s + (c.limite ?? 0), 0), [linhas]);
  const usadoGeral = useMemo(() => linhas.reduce((s, c) => s + c.usado, 0), [linhas]);
  const pctGeral = limiteGeral > 0 ? Math.min(1, usadoGeral / limiteGeral) : 0;
  const disponivelGeral = limiteGeral - usadoGeral;

  // Cadastro/edição do cartão direto aqui: nome, limite e vencimento,
  // mesmo sem nenhuma fatura lançada ainda. O cartão é uma despesa fixa
  // (cartao = true), então aparece em Despesas pra lançar a fatura.
  const supabase = createClient();
  const [form, setForm] = useState<{ id: string | null } | null>(null);
  const [nome, setNome] = useState("");
  const [limite, setLimite] = useState("");
  const [dia, setDia] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function abrir(cartao?: Item) {
    setForm({ id: cartao?.id ?? null });
    setNome(cartao?.nome ?? "");
    setLimite(cartao?.limite != null ? String(cartao.limite) : "");
    setDia(cartao?.dia_vencimento != null ? String(cartao.dia_vencimento) : "");
    setError(null);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const d = dia ? Math.floor(Number(dia)) : null;
    if (!nome.trim()) return setError("Informe o nome do cartão");
    if (d !== null && !(d >= 1 && d <= 31)) return setError("Dia de vencimento entre 1 e 31");
    setSaving(true);
    setError(null);
    const campos = { nome: nome.trim(), limite: limite ? Number(limite) : null, dia_vencimento: d };
    let erro: string | null = null;
    if (form?.id) {
      const { error } = await supabase.from("items").update(campos).eq("id", form.id);
      erro = error?.message ?? null;
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) erro = "Sessão não encontrada";
      else {
        const { error } = await supabase.from("items").insert({
          ...campos,
          user_id: user.id,
          tipo: "despesa",
          expectativa: false,
          fixo: true,
          cartao: true,
          competencia_unica: null,
        });
        erro = error?.message ?? null;
      }
    }
    setSaving(false);
    if (erro) return setError(erro);
    // Despesas e Início leem os itens da carga da página: recarrega pra
    // o cartão novo/alterado aparecer em todas as abas.
    window.location.reload();
  }

  const formulario = form ? (
    <form onSubmit={salvar} className="space-y-2 rounded-3xl bg-surface p-4 shadow-card">
      <p className="text-[13px] font-semibold text-ink-400">{form.id ? "Editar cartão" : "Novo cartão"}</p>
      <input
        autoFocus
        placeholder="Nome do cartão (ex: Nubank)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="field"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="field-label">Limite</span>
          <MoneyInput placeholder="0,00" value={limite} onValueChange={setLimite} className="field" />
        </label>
        <label className="block space-y-1">
          <span className="field-label">Dia de vencimento</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            placeholder="ex: 10"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className="field"
          />
        </label>
      </div>
      {error && <p className="text-xs font-medium text-coral-500">Erro: {error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={() => setForm(null)} className="btn-secondary flex-1">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          Salvar
        </button>
      </div>
      {!form.id && (
        <p className="caption px-0.5">A fatura de cada mês você lança depois em Despesas, no card do cartão.</p>
      )}
    </form>
  ) : (
    <button onClick={() => abrir()} className="btn-add">
      + Adicionar cartão
    </button>
  );

  if (cartoes.length === 0) {
    return (
      <div className="space-y-5 px-4">
        <EmptyState icon={CreditCard} title="Nenhum cartão cadastrado" hint="Adicione seu primeiro cartão abaixo" />
        {formulario}
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
        progressLabel={`${Math.round(pctGeral * 100)}% do limite em uso · pago já liberado`}
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
                        {c.dia_vencimento ? ` · vence dia ${c.dia_vencimento}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
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
                    <button
                      onClick={() => abrir(c)}
                      className="icon-btn hover:text-accent"
                      aria-label={`Editar limite e vencimento de ${c.nome}`}
                    >
                      <Pencil size={16} strokeWidth={2} aria-hidden />
                    </button>
                  </div>
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

      {formulario}
    </div>
  );
}
