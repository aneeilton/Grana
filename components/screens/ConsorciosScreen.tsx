"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CarFront, Gavel, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/ui/Card";
import { resumirConsorcios, type ResumoConsorcio } from "@/lib/consorcios";
import { currentCompetencia, formatMoney, monthLabel, monthYearLabel, shiftCompetencia } from "@/lib/format";
import type { Consorcio, Item, Lancamento } from "@/lib/types";

const inputCls =
  "w-full rounded-2xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400";

/**
 * Aba Consórcio: visão própria das cotas. As parcelas em si são despesas
 * parceladas comuns (pagas no Fluxo → Despesas, entram na projeção); aqui
 * fica o que é do consórcio: carta, saldo devedor, contemplação e lance.
 *
 * Intenção de lance é só simulação (não entra na projeção) até ser
 * aceita: aí vira despesa pontual no mês do lance e as parcelas seguintes
 * passam pro valor pós-lance. Ações que mexem nas despesas recarregam a
 * página pra Despesas/Início refletirem na hora.
 */
export function ConsorciosScreen({
  consorcios,
  items,
  lancamentos,
  saldoContas,
}: {
  consorcios: Consorcio[];
  items: Item[];
  lancamentos: Lancamento[];
  saldoContas: number;
}) {
  const supabase = createClient();
  const hoje = useMemo(() => currentCompetencia(), []);
  const resumos = useMemo(
    () => resumirConsorcios(consorcios, items, lancamentos, hoje),
    [consorcios, items, lancamentos, hoje]
  );

  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [carta, setCarta] = useState("");
  const [taxa, setTaxa] = useState("");
  const [parcela, setParcela] = useState("");
  const [restantes, setRestantes] = useState("");
  const [contemplado, setContemplado] = useState(false);
  const [dia, setDia] = useState("");
  const [lanceDe, setLanceDe] = useState<string | null>(null);
  const [lanceValor, setLanceValor] = useState("");
  const [lanceParcela, setLanceParcela] = useState("");
  const [lanceMes, setLanceMes] = useState(hoje);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const naoContemplados = resumos.filter((r) => !r.consorcio.contemplado);
  const totalParcelas = resumos.reduce((s, r) => s + (r.restantes > 0 ? r.parcelaAtual : 0), 0);
  const totalDevedor = resumos.reduce((s, r) => s + r.saldoDevedor, 0);
  const totalCartas = resumos.reduce((s, r) => s + Number(r.consorcio.carta), 0);

  // Intenções de lance em aberto, somadas: quanto sai da conta e quanto
  // as parcelas caem por mês se todas forem aceitas.
  const intencoes = resumos.filter((r) => r.consorcio.lance_status === "intencao" && r.consorcio.lance_valor);
  const lanceTotal = intencoes.reduce((s, r) => s + Number(r.consorcio.lance_valor), 0);
  const economiaMensal = intencoes.reduce(
    (s, r) => s + Math.max(0, r.parcelaAtual - Number(r.consorcio.lance_parcela ?? r.parcelaAtual)),
    0
  );

  function resetForm() {
    setOpen(false);
    setNome("");
    setCarta("");
    setTaxa("");
    setParcela("");
    setRestantes("");
    setContemplado(false);
    setDia("");
    setError(null);
  }

  async function usuario() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const n = Math.floor(Number(restantes));
    if (!nome.trim() || !(Number(carta) > 0) || !(Number(parcela) > 0) || !(n > 1)) {
      return setError("Preencha nome, carta, parcela e parcelas a vencer (2 ou mais)");
    }
    setSaving(true);
    setError(null);
    const user = await usuario();
    if (!user) {
      setSaving(false);
      return setError("Sessão não encontrada");
    }
    const { data: c, error: e1 } = await supabase
      .from("consorcios")
      .insert({
        user_id: user.id,
        nome: nome.trim(),
        carta: Number(carta),
        taxa_adm: taxa ? Number(taxa) : null,
        contemplado,
      })
      .select()
      .single();
    if (e1 || !c) {
      setSaving(false);
      return setError(e1?.message ?? "Falha ao salvar");
    }
    // A despesa parcelada: parcela deste mês = 1ª das "a vencer".
    const { data: item, error: e2 } = await supabase
      .from("items")
      .insert({
        user_id: user.id,
        tipo: "despesa",
        nome: `Consórcio ${nome.trim()}`,
        dia_vencimento: dia ? Number(dia) : null,
        expectativa: false,
        fixo: false,
        competencia_unica: hoje,
        cartao: false,
        parcelas_total: n,
        consorcio_id: c.id,
      })
      .select()
      .single();
    if (e2 || !item) {
      setSaving(false);
      return setError(e2?.message ?? "Falha ao criar a despesa do consórcio");
    }
    const linhas = Array.from({ length: n }, (_, i) => ({
      item_id: item.id,
      user_id: user.id,
      competencia: shiftCompetencia(hoje, i),
      valor: Number(parcela),
      pago: false,
    }));
    const { error: e3 } = await supabase.from("lancamentos").upsert(linhas, { onConflict: "item_id,competencia" });
    setSaving(false);
    if (e3) return setError(e3.message);
    window.location.reload();
  }

  function abrirLance(r: ResumoConsorcio) {
    setLanceDe(r.consorcio.id);
    setLanceValor(r.consorcio.lance_valor != null ? String(r.consorcio.lance_valor) : "");
    setLanceParcela(r.consorcio.lance_parcela != null ? String(r.consorcio.lance_parcela) : "");
    setLanceMes(r.consorcio.lance_competencia ?? hoje);
    setError(null);
  }

  async function salvarIntencao(e: React.FormEvent) {
    e.preventDefault();
    if (!lanceDe || !(Number(lanceValor) > 0)) return setError("Informe o valor do lance");
    setSaving(true);
    const { error } = await supabase
      .from("consorcios")
      .update({
        lance_valor: Number(lanceValor),
        lance_parcela: lanceParcela ? Number(lanceParcela) : null,
        lance_competencia: lanceMes,
        lance_status: "intencao",
      })
      .eq("id", lanceDe);
    setSaving(false);
    if (error) return setError(error.message);
    window.location.reload();
  }

  async function cancelarIntencao(c: Consorcio) {
    if (!window.confirm(`Cancelar a intenção de lance de ${c.nome}?`)) return;
    const { error } = await supabase
      .from("consorcios")
      .update({ lance_valor: null, lance_parcela: null, lance_competencia: null, lance_status: null })
      .eq("id", c.id);
    if (error) return setError(error.message);
    window.location.reload();
  }

  // Lance aceito: vira despesa pontual (dinheiro próprio) no mês do lance,
  // as parcelas em aberto depois dele passam pro valor pós-lance e a cota
  // fica contemplada.
  async function aceitarLance(r: ResumoConsorcio) {
    const c = r.consorcio;
    if (!c.lance_valor || !c.lance_competencia || !r.principal) return;
    const msg =
      `Confirmar lance aceito em ${c.nome}?\n\n` +
      `• ${formatMoney(Number(c.lance_valor))} vira despesa em ${monthYearLabel(c.lance_competencia)}\n` +
      (c.lance_parcela ? `• Parcelas seguintes passam para ${formatMoney(Number(c.lance_parcela))}\n` : "") +
      `• A cota fica como contemplada`;
    if (!window.confirm(msg)) return;
    setSaving(true);
    setError(null);
    const user = await usuario();
    if (!user) {
      setSaving(false);
      return setError("Sessão não encontrada");
    }
    const { data: lanceItem, error: e1 } = await supabase
      .from("items")
      .insert({
        user_id: user.id,
        tipo: "despesa",
        nome: `Lance consórcio ${c.nome}`,
        expectativa: false,
        fixo: false,
        competencia_unica: c.lance_competencia,
        cartao: false,
        consorcio_id: c.id,
      })
      .select()
      .single();
    if (e1 || !lanceItem) {
      setSaving(false);
      return setError(e1?.message ?? "Falha ao lançar o lance");
    }
    const { error: e2 } = await supabase.from("lancamentos").insert({
      item_id: lanceItem.id,
      user_id: user.id,
      competencia: c.lance_competencia,
      valor: Number(c.lance_valor),
      pago: false,
    });
    if (e2) {
      setSaving(false);
      return setError(e2.message);
    }
    if (c.lance_parcela) {
      const { error: e3 } = await supabase
        .from("lancamentos")
        .update({ valor: Number(c.lance_parcela) })
        .eq("item_id", r.principal.id)
        .eq("pago", false)
        .gt("competencia", c.lance_competencia);
      if (e3) {
        setSaving(false);
        return setError(e3.message);
      }
    }
    const { error: e4 } = await supabase
      .from("consorcios")
      .update({ contemplado: true, lance_status: "aceito" })
      .eq("id", c.id);
    setSaving(false);
    if (e4) return setError(e4.message);
    window.location.reload();
  }

  async function alternarContemplado(c: Consorcio) {
    const { error } = await supabase.from("consorcios").update({ contemplado: !c.contemplado }).eq("id", c.id);
    if (error) return setError(error.message);
    window.location.reload();
  }

  async function remover(c: Consorcio) {
    if (!window.confirm(`Remover o consórcio ${c.nome}? As parcelas e o lance ligados a ele também saem.`)) return;
    const { error } = await supabase.from("consorcios").delete().eq("id", c.id);
    if (error) return setError(error.message);
    window.location.reload();
  }

  return (
    <div className="space-y-4 px-4">
      {resumos.length === 0 ? (
        <EmptyState icon={CarFront} title="Nenhum consórcio ainda" hint="Adicione sua primeira cota abaixo" />
      ) : (
        <Card className="bg-gradient-to-br from-sky-500 to-[#0B3B30] text-white">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Parcelas de consórcio</p>
          <p className="mt-1 text-3xl font-extrabold [font-variant-numeric:tabular-nums]">
            {formatMoney(totalParcelas)}
            <span className="text-base font-bold text-white/70">/mês</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-white/90">
            {formatMoney(totalCartas)} em cartas · {formatMoney(totalDevedor)} a pagar
          </p>

          <div className="mt-4 border-t border-white/15 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Saldo devedor por cota</p>
            <div className="mt-1.5 space-y-1.5">
              {resumos.map((r) => (
                <div key={r.consorcio.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 text-white/90">
                    {r.consorcio.contemplado && <BadgeCheck size={14} strokeWidth={2.5} className="shrink-0" />}
                    <span className="truncate">{r.consorcio.nome}</span>
                  </span>
                  <span className="shrink-0 font-bold [font-variant-numeric:tabular-nums]">
                    {formatMoney(r.saldoDevedor)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-1.5 text-sm">
                <span className="font-semibold text-white/80">Total a pagar</span>
                <span className="shrink-0 font-extrabold [font-variant-numeric:tabular-nums]">
                  {formatMoney(totalDevedor)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {intencoes.length > 0 && (
        <Card className="bg-sun-500/10">
          <div className="flex items-center gap-2 text-sun-500">
            <Gavel size={16} strokeWidth={2.25} />
            <p className="text-sm font-bold">Intenção de lance (simulação)</p>
          </div>
          <div className="mt-2 space-y-1 text-xs text-ink-700">
            <div className="flex justify-between gap-3">
              <span>Sai da conta ({intencoes.length} {intencoes.length === 1 ? "lance" : "lances"})</span>
              <span className="font-bold [font-variant-numeric:tabular-nums]">{formatMoney(lanceTotal)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Saldo nas contas hoje → depois dos lances</span>
              <span
                className={`font-bold [font-variant-numeric:tabular-nums] ${
                  saldoContas - lanceTotal < 0 ? "text-coral-500" : ""
                }`}
              >
                {formatMoney(saldoContas)} → {formatMoney(saldoContas - lanceTotal)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Parcelas por mês</span>
              <span className="font-bold [font-variant-numeric:tabular-nums]">
                {formatMoney(totalParcelas)} → {formatMoney(totalParcelas - economiaMensal)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Economia por mês</span>
              <span className="font-bold text-brand-700 [font-variant-numeric:tabular-nums]">
                {formatMoney(economiaMensal)}
              </span>
            </div>
            {economiaMensal > 0 && (
              <p className="pt-1 text-[11px] text-ink-500">
                O lance se paga com a economia nas parcelas em uns {Math.ceil(lanceTotal / economiaMensal)} meses. Não
                entra na projeção até você marcar como aceito.
              </p>
            )}
          </div>
        </Card>
      )}

      {resumos.map((r) => {
        const c = r.consorcio;
        const total = r.pagas + r.restantes;
        const pct = total > 0 ? r.pagas / total : 0;
        return (
          <Card key={c.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
                  <CarFront size={16} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-800">{c.nome}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => alternarContemplado(c)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.contemplado ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {c.contemplado ? "Contemplado" : "Não contemplado"}
                    </button>
                    {c.taxa_adm != null && (
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-500">
                        Tx. adm {Number(c.taxa_adm).toLocaleString("pt-BR")}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => remover(c)} className="text-ink-400 hover:text-coral-500" aria-label="Remover">
                <X size={16} strokeWidth={2.25} />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-ink-50 p-2">
                <p className="text-[10px] font-semibold text-ink-400">Carta</p>
                <p className="text-xs font-extrabold text-ink-800 [font-variant-numeric:tabular-nums]">
                  {formatMoney(Number(c.carta))}
                </p>
              </div>
              <div className="rounded-2xl bg-ink-50 p-2">
                <p className="text-[10px] font-semibold text-ink-400">Parcela</p>
                <p className="text-xs font-extrabold text-ink-800 [font-variant-numeric:tabular-nums]">
                  {formatMoney(r.parcelaAtual)}
                </p>
              </div>
              <div className="rounded-2xl bg-ink-50 p-2">
                <p className="text-[10px] font-semibold text-ink-400">Saldo devedor</p>
                <p className="text-xs font-extrabold text-coral-500 [font-variant-numeric:tabular-nums]">
                  {formatMoney(r.saldoDevedor)}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-sky-500" style={{ width: `${pct * 100}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-ink-400">
                {r.restantes} {r.restantes === 1 ? "parcela a vencer" : "parcelas a vencer"}
                {r.ultimaCompetencia ? ` · última em ${monthYearLabel(r.ultimaCompetencia)}` : ""}
                {c.contemplado ? " · conta como dívida no patrimônio" : ""}
              </p>
            </div>

            {c.lance_status === "intencao" && c.lance_valor != null && (
              <div className="mt-3 rounded-2xl bg-sun-500/10 p-3 text-xs">
                <p className="font-bold text-sun-500">
                  Intenção de lance em {monthLabel(c.lance_competencia ?? hoje)}: {formatMoney(Number(c.lance_valor))}
                  {Number(c.carta) > 0 ? ` (${Math.round((Number(c.lance_valor) / Number(c.carta)) * 100)}% da carta)` : ""}
                </p>
                {c.lance_parcela != null && (
                  <p className="mt-0.5 text-ink-700">
                    Parcela cai de {formatMoney(r.parcelaAtual)} para {formatMoney(Number(c.lance_parcela))}
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => aceitarLance(r)}
                    disabled={saving}
                    className="flex-1 rounded-xl bg-brand-600 py-2 font-bold text-white disabled:opacity-60"
                  >
                    Lance aceito
                  </button>
                  <button onClick={() => abrirLance(r)} className="rounded-xl bg-white px-3 py-2 font-bold text-ink-700">
                    Editar
                  </button>
                  <button
                    onClick={() => cancelarIntencao(c)}
                    className="rounded-xl bg-white px-3 py-2 font-bold text-ink-500"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {c.lance_status === "aceito" && c.lance_valor != null && (
              <p className="mt-2 text-[11px] text-ink-500">
                Lance de {formatMoney(Number(c.lance_valor))} aceito em {monthYearLabel(c.lance_competencia ?? hoje)}{" "}
                (pagamento em Fluxo → Despesas).
              </p>
            )}
            {!c.contemplado && c.lance_status !== "intencao" && lanceDe !== c.id && (
              <button
                onClick={() => abrirLance(r)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-sun-400 py-2 text-xs font-bold text-sun-500"
              >
                <Gavel size={14} strokeWidth={2.25} />
                Planejar lance
              </button>
            )}
            {lanceDe === c.id && (
              <form onSubmit={salvarIntencao} className="mt-3 space-y-2 border-t border-ink-100 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Intenção de lance</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="px-1 text-[11px] font-semibold text-ink-500">Valor do lance</span>
                    <input
                      autoFocus
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={lanceValor}
                      onChange={(e) => setLanceValor(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="px-1 text-[11px] font-semibold text-ink-500">Parcela pós-lance</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      placeholder="opcional"
                      value={lanceParcela}
                      onChange={(e) => setLanceParcela(e.target.value)}
                      className={inputCls}
                    />
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="px-1 text-[11px] font-semibold text-ink-500">Mês do lance</span>
                  <select value={lanceMes} onChange={(e) => setLanceMes(e.target.value)} className={inputCls}>
                    {Array.from({ length: 12 }, (_, i) => shiftCompetencia(hoje, i)).map((m) => (
                      <option key={m} value={m}>
                        {monthYearLabel(m)}
                      </option>
                    ))}
                  </select>
                </label>
                {error && <p className="text-xs font-medium text-coral-500">Erro: {error}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLanceDe(null)}
                    className="flex-1 rounded-2xl bg-ink-100 py-2.5 text-sm font-semibold text-ink-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-2xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                  >
                    Salvar intenção
                  </button>
                </div>
              </form>
            )}
          </Card>
        );
      })}

      {naoContemplados.length > 0 && (
        <p className="px-1 text-[11px] text-ink-400">
          Cotas não contempladas são compromisso futuro: as parcelas entram na projeção, mas o saldo devedor só vira
          dívida no patrimônio quando a cota for contemplada.
        </p>
      )}

      {open ? (
        <form onSubmit={criar} className="space-y-2 rounded-3xl bg-white p-4 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Novo consórcio</p>
          <input autoFocus placeholder="Nome (ex: Carro cota 1)" value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" inputMode="decimal" step="0.01" placeholder="Valor da carta" value={carta} onChange={(e) => setCarta(e.target.value)} className={inputCls} />
            <input type="number" inputMode="decimal" step="0.01" placeholder="Taxa adm (%)" value={taxa} onChange={(e) => setTaxa(e.target.value)} className={inputCls} />
            <input type="number" inputMode="decimal" step="0.01" placeholder="Parcela atual" value={parcela} onChange={(e) => setParcela(e.target.value)} className={inputCls} />
            <input type="number" inputMode="numeric" min={2} placeholder="Parcelas a vencer" value={restantes} onChange={(e) => setRestantes(e.target.value)} className={inputCls} />
            <input type="number" min={1} max={31} placeholder="Dia de vencimento" value={dia} onChange={(e) => setDia(e.target.value)} className={inputCls} />
          </div>
          <label className="flex items-center gap-2 px-1 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={contemplado}
              onChange={(e) => setContemplado(e.target.checked)}
              className="h-4 w-4 rounded accent-brand-600"
            />
            Já foi contemplado (já tenho o bem)
          </label>
          <p className="px-1 text-[11px] text-ink-400">
            A parcela de {monthLabel(hoje)} conta como a 1ª das parcelas a vencer.
          </p>
          {error && !lanceDe && <p className="text-xs font-medium text-coral-500">Erro: {error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={resetForm} className="flex-1 rounded-2xl bg-ink-100 py-2.5 text-sm font-semibold text-ink-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="flex-1 rounded-2xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              Salvar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-2xl border-2 border-dashed border-sky-400 py-3 text-sm font-bold text-sky-500"
        >
          + Adicionar consórcio
        </button>
      )}
      {error && !open && !lanceDe && <p className="px-1 text-xs font-medium text-coral-500">Erro: {error}</p>}
    </div>
  );
}
