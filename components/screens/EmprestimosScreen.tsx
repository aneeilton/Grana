"use client";

import { useMemo, useState } from "react";
import { HandCoins, Trash2 } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/ui/Card";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { resumirEmprestimos } from "@/lib/emprestimos";
import { currentCompetencia, formatMoney, monthYearLabel, shiftCompetencia } from "@/lib/format";
import type { Consorcio, Emprestimo, Item, Lancamento } from "@/lib/types";

/**
 * Aba Empréstimos: visão própria de cada empréstimo. As parcelas são uma
 * despesa parcelada comum (pagas no Fluxo → Despesas, entram na projeção);
 * aqui fica o que é do empréstimo: valor recebido, quanto falta, quanto
 * custa no total e, se for o caso, o lance de consórcio que ele pagou.
 */
export function EmprestimosScreen({
  emprestimos,
  consorcios,
  items,
  lancamentos,
}: {
  emprestimos: Emprestimo[];
  consorcios: Consorcio[];
  items: Item[];
  lancamentos: Lancamento[];
}) {
  const supabase = createClient();
  const hoje = useMemo(() => currentCompetencia(), []);
  const resumos = useMemo(
    () => resumirEmprestimos(emprestimos, items, lancamentos, hoje),
    [emprestimos, items, lancamentos, hoje]
  );
  const consorcioPorId = useMemo(() => new Map(consorcios.map((c) => [c.id, c])), [consorcios]);

  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [parcela, setParcela] = useState("");
  const [nParcelas, setNParcelas] = useState("");
  const [primeira, setPrimeira] = useState(shiftCompetencia(hoje, 1).slice(0, 7));
  const [dia, setDia] = useState("");
  const [taxa, setTaxa] = useState("");
  const [consorcioId, setConsorcioId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ativos = resumos.filter((r) => r.restantes > 0);
  const totalDevedor = resumos.reduce((s, r) => s + r.saldoDevedor, 0);
  const totalMensal = ativos.reduce((s, r) => s + r.parcelaAtual, 0);
  const ultima = ativos.reduce<string | null>(
    (max, r) => (r.ultimaCompetencia && (!max || r.ultimaCompetencia > max) ? r.ultimaCompetencia : max),
    null
  );

  function resetForm() {
    setOpen(false);
    setNome("");
    setValor("");
    setParcela("");
    setNParcelas("");
    setPrimeira(shiftCompetencia(hoje, 1).slice(0, 7));
    setDia("");
    setTaxa("");
    setConsorcioId("");
    setError(null);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.floor(Number(nParcelas));
    if (!nome.trim() || !(Number(valor) > 0) || !(Number(parcela) > 0) || !(n >= 1) || !primeira) {
      return setError("Preencha nome, valor recebido, parcela, número de parcelas e o mês da 1ª parcela");
    }
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return setError("Sessão não encontrada");
    }
    const { data: emp, error: e1 } = await supabase
      .from("emprestimos")
      .insert({
        user_id: user.id,
        nome: nome.trim(),
        valor: Number(valor),
        taxa_juros: taxa ? Number(taxa.replace(",", ".")) : null,
        consorcio_id: consorcioId || null,
      })
      .select()
      .single();
    if (e1 || !emp) {
      setSaving(false);
      return setError(e1?.message ?? "Falha ao salvar");
    }
    const inicio = `${primeira}-01`;
    const { data: item, error: e2 } = await supabase
      .from("items")
      .insert({
        user_id: user.id,
        tipo: "despesa",
        nome: `Empréstimo ${nome.trim()}`,
        dia_vencimento: dia ? Number(dia) : null,
        expectativa: false,
        fixo: false,
        competencia_unica: inicio,
        cartao: false,
        // parcela única = despesa pontual no mês (o banco só aceita
        // parcelas_total de 2 pra cima)
        parcelas_total: n > 1 ? n : null,
        emprestimo_id: emp.id,
      })
      .select()
      .single();
    if (e2 || !item) {
      // não deixa um empréstimo "vazio" (sem parcelas) pra trás
      await supabase.from("emprestimos").delete().eq("id", emp.id);
      setSaving(false);
      return setError(e2?.message ?? "Falha ao criar as parcelas");
    }
    // Parcelas de meses que já passaram entram como pagas.
    const linhas = Array.from({ length: n }, (_, i) => {
      const competencia = shiftCompetencia(inicio, i);
      return {
        item_id: item.id,
        user_id: user.id,
        competencia,
        valor: Number(parcela),
        pago: competencia < hoje,
      };
    });
    const { error: e3 } = await supabase.from("lancamentos").upsert(linhas, { onConflict: "item_id,competencia" });
    setSaving(false);
    if (e3) return setError(e3.message);
    window.location.reload();
  }

  async function remover(emp: Emprestimo) {
    if (!window.confirm(`Remover o empréstimo ${emp.nome}? As parcelas ligadas a ele também saem.`)) return;
    const { error } = await supabase.from("emprestimos").delete().eq("id", emp.id);
    if (error) return setError(error.message);
    window.location.reload();
  }

  return (
    <div className="space-y-5 px-4">
      {resumos.length === 0 ? (
        <EmptyState icon={HandCoins} title="Nenhum empréstimo ainda" hint="Adicione os seus no botão abaixo" />
      ) : (
        <SummaryCard
          tone="coral"
          title="Saldo devedor dos empréstimos"
          value={formatMoney(totalDevedor)}
          subtitle={
            totalMensal > 0
              ? `${formatMoney(totalMensal)}/mês em parcelas${ultima ? ` · até ${monthYearLabel(ultima).toLowerCase()}` : ""}`
              : "Tudo quitado"
          }
          rowsTitle="Falta pagar por empréstimo"
          rows={resumos.map((r) => ({
            id: r.emprestimo.id,
            label: r.emprestimo.nome,
            value: formatMoney(r.saldoDevedor),
            muted: r.restantes === 0,
          }))}
        />
      )}

      {resumos.map((r) => {
        const emp = r.emprestimo;
        const consorcio = emp.consorcio_id ? consorcioPorId.get(emp.consorcio_id) : undefined;
        const pct = r.total > 0 ? r.pagas / r.total : 0;
        return (
          <Card key={emp.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="app-icon bg-coral-400">
                  <HandCoins size={18} weight="fill" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink-900">{emp.nome}</p>
                  {consorcio && <p className="caption truncate">Usado no lance de {consorcio.nome}</p>}
                </div>
              </div>
              <button
                onClick={() => remover(emp)}
                className="icon-btn hover:text-coral-500"
                aria-label={`Remover empréstimo ${emp.nome}`}
              >
                <Trash2 size={17} strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-ink-500">
                  {r.pagas} de {r.total} parcelas pagas
                </span>
                <span className="font-semibold text-ink-900">{Math.round(pct * 100)}%</span>
              </div>
              <div
                className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
                role="progressbar"
                aria-label={`Parcelas pagas de ${emp.nome}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(pct * 100)}
              >
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct * 100}%` }} />
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
              {[
                { label: "Recebido", value: formatMoney(Number(emp.valor)) },
                { label: "Parcela", value: r.restantes > 0 ? formatMoney(r.parcelaAtual) : "Quitado" },
                { label: "Falta pagar", value: formatMoney(r.saldoDevedor) },
                { label: "Custo (juros)", value: formatMoney(r.custo) },
              ].map((d) => (
                <div key={d.label} className="min-w-0">
                  <dt className="text-[12px] text-ink-500">{d.label}</dt>
                  <dd className="truncate text-[15px] font-semibold text-ink-900">{d.value}</dd>
                </div>
              ))}
            </dl>

            {r.primeiraCompetencia && r.ultimaCompetencia && (
              <p className="caption mt-3 border-t border-ink-100 pt-2.5">
                De {monthYearLabel(r.primeiraCompetencia).toLowerCase()} a{" "}
                {monthYearLabel(r.ultimaCompetencia).toLowerCase()}
                {emp.taxa_juros ? ` · ${String(emp.taxa_juros).replace(".", ",")}% a.m.` : ""}
                {consorcio?.lance_valor
                  ? ` · cobre ${Math.round((Number(emp.valor) / Number(consorcio.lance_valor)) * 100)}% do lance de ${formatMoney(Number(consorcio.lance_valor))}`
                  : ""}
              </p>
            )}
          </Card>
        );
      })}

      {open ? (
        <form onSubmit={criar} className="space-y-2 rounded-3xl bg-surface p-4 shadow-card">
          <p className="text-[13px] font-semibold text-ink-400">Novo empréstimo</p>
          <input
            autoFocus
            placeholder="Nome (ex: Bradesco)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="field"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span className="field-label">Valor recebido</span>
              <MoneyInput placeholder="0,00" value={valor} onValueChange={setValor} className="field" />
            </label>
            <label className="block space-y-1">
              <span className="field-label">Valor da parcela</span>
              <MoneyInput placeholder="0,00" value={parcela} onValueChange={setParcela} className="field" />
            </label>
            <label className="block space-y-1">
              <span className="field-label">Nº de parcelas</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={nParcelas}
                onChange={(e) => setNParcelas(e.target.value)}
                className="field"
              />
            </label>
            <label className="block space-y-1">
              <span className="field-label">1ª parcela em</span>
              <input type="month" value={primeira} onChange={(e) => setPrimeira(e.target.value)} className="field" />
            </label>
            <label className="block space-y-1">
              <span className="field-label">Dia de vencimento</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                placeholder="opcional"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="field"
              />
            </label>
            <label className="block space-y-1">
              <span className="field-label">Juros (% a.m.)</span>
              <input
                inputMode="decimal"
                placeholder="opcional"
                value={taxa}
                onChange={(e) => setTaxa(e.target.value)}
                className="field"
              />
            </label>
          </div>
          {consorcios.length > 0 && (
            <label className="block space-y-1">
              <span className="field-label">Usado no lance de</span>
              <select value={consorcioId} onChange={(e) => setConsorcioId(e.target.value)} className="field">
                <option value="">Nenhum consórcio</option>
                {consorcios.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          {Number(valor) > 0 && Number(parcela) > 0 && Number(nParcelas) > 0 && (
            <p className="caption px-0.5">
              Total a pagar {formatMoney(Number(parcela) * Number(nParcelas))} · custo de{" "}
              {formatMoney(Number(parcela) * Number(nParcelas) - Number(valor))}
            </p>
          )}
          {error && <p className="text-xs font-medium text-coral-500">Erro: {error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              Salvar
            </button>
          </div>
          <p className="caption px-0.5">
            As parcelas entram em Despesas (grupo Empréstimos) e na projeção; meses que já passaram ficam como pagos.
          </p>
        </form>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-add">
          + Adicionar empréstimo
        </button>
      )}
    </div>
  );
}
