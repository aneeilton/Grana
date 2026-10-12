"use client";

import { MoneyInput } from "@/components/ui/MoneyInput";
import { useMemo, useState } from "react";
import { BadgeCheck, CarFront, Gavel, Trash2 } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/ui/Card";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { resumirConsorcios, type ResumoConsorcio } from "@/lib/consorcios";
import { currentCompetencia, formatMoney, monthLabel, monthYearLabel, shiftCompetencia } from "@/lib/format";
import type { Consorcio, Item, Lancamento } from "@/lib/types";

const inputCls = "field";

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
    <div className="space-y-5 px-4">
      {resumos.length === 0 ? (
        <EmptyState icon={CarFront} title="Nenhum consórcio ainda" hint="Adicione sua primeira cota abaixo" />
      ) : (
        <SummaryCard
          tone="sky"
          title="Parcelas de consórcio"
          value={formatMoney(totalParcelas)}
          valueSuffix="/mês"
          subtitle={`${formatMoney(totalCartas)} em cartas · ${formatMoney(totalDevedor)} a pagar`}
          rowsTitle="Saldo devedor por cota"
          rows={resumos.map((r) => ({
            id: r.consorcio.id,
            label: r.consorcio.nome,
            value: formatMoney(r.saldoDevedor),
            icon: r.consorcio.contemplado ? (
              <BadgeCheck size={15} strokeWidth={2.5} className="shrink-0" aria-label="contemplado" />
            ) : undefined,
          }))}
          totalLabel="Total a pagar"
          totalValue={formatMoney(totalDevedor)}
        />
      )}

      {intencoes.length > 0 && (
        <Card className="bg-sun-100 shadow-none">
          <div className="flex items-center gap-2 text-sun-500">
            <Gavel size={17} strokeWidth={2.25} aria-hidden />
            <p className="text-[15px] font-semibold">Intenção de lance (simulação)</p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="min-w-0">
              <dt className="caption">Sai da conta · {intencoes.length} {intencoes.length === 1 ? "lance" : "lances"}</dt>
              <dd className="text-[15px] font-semibold text-ink-900">{formatMoney(lanceTotal)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="caption">Saldo depois dos lances</dt>
              <dd className={`text-[15px] font-semibold ${saldoContas - lanceTotal < 0 ? "text-coral-500" : "text-ink-900"}`}>
                {formatMoney(saldoContas - lanceTotal)}
              </dd>
              <dd className="caption">hoje: {formatMoney(saldoContas)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="caption">Parcelas por mês</dt>
              <dd className="text-[15px] font-semibold text-ink-900">{formatMoney(totalParcelas - economiaMensal)}</dd>
              <dd className="caption">hoje: {formatMoney(totalParcelas)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="caption">Economia por mês</dt>
              <dd className="text-[15px] font-semibold text-brand-700">{formatMoney(economiaMensal)}</dd>
            </div>
          </dl>
          {economiaMensal > 0 && (
            <p className="mt-3 border-t border-sun-400/40 pt-3 text-[13px] text-ink-700">
              O lance se paga com a economia nas parcelas em uns {Math.ceil(lanceTotal / economiaMensal)} meses. Não
              entra na projeção até você marcar como aceito.
            </p>
          )}
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
                <span className="app-icon bg-sky-400">
                  <CarFront size={18} weight="fill" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-800">{c.nome}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => alternarContemplado(c)}
                      className={`inline-flex min-h-8 items-center rounded-full px-2.5 text-xs font-semibold transition active:scale-95 ${
                        c.contemplado ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {c.contemplado ? "Contemplado" : "Não contemplado"}
                    </button>
                    {c.taxa_adm != null && (
                      <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-500">
                        Tx. adm {Number(c.taxa_adm).toLocaleString("pt-BR")}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => remover(c)} className="icon-btn hover:text-coral-500" aria-label={`Remover ${c.nome}`}>
                <Trash2 size={17} strokeWidth={2} aria-hidden />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-ink-50 px-2 py-2.5">
                <p className="text-[11px] font-medium text-ink-500">Carta</p>
                <p className="mt-0.5 text-[13px] font-semibold text-ink-800">
                  {formatMoney(Number(c.carta))}
                </p>
              </div>
              <div className="rounded-xl bg-ink-50 px-2 py-2.5">
                <p className="text-[11px] font-medium text-ink-500">Parcela</p>
                <p className="mt-0.5 text-[13px] font-semibold text-ink-800">
                  {formatMoney(r.parcelaAtual)}
                </p>
              </div>
              <div className="rounded-xl bg-ink-50 px-2 py-2.5">
                <p className="text-[11px] font-medium text-ink-500">Saldo devedor</p>
                <p className="mt-0.5 text-[13px] font-semibold text-coral-500">
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
                    className="btn-primary flex-1"
                  >
                    Lance aceito
                  </button>
                  <button onClick={() => abrirLance(r)} className="btn bg-surface text-ink-800">
                    Editar
                  </button>
                  <button
                    onClick={() => cancelarIntencao(c)}
                    className="btn bg-surface text-ink-500"
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
                className="btn-add mt-3"
              >
                <Gavel size={14} strokeWidth={2.25} />
                Planejar lance
              </button>
            )}
            {lanceDe === c.id && (
              <form onSubmit={salvarIntencao} className="mt-3 space-y-2 border-t border-ink-100 pt-3">
                <p className="text-[13px] font-semibold text-ink-400">Intenção de lance</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="px-1 text-[11px] font-semibold text-ink-500">Valor do lance</span>
                    <MoneyInput
                      autoFocus
                      value={lanceValor}
                      onValueChange={setLanceValor}
                      className={inputCls}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="px-1 text-[11px] font-semibold text-ink-500">Parcela pós-lance</span>
                    <MoneyInput
                      placeholder="opcional"
                      value={lanceParcela}
                      onValueChange={setLanceParcela}
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
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1"
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
        <p className="caption px-1">
          Cotas não contempladas são compromisso futuro: as parcelas entram na projeção, mas o saldo devedor só vira
          dívida no patrimônio quando a cota for contemplada.
        </p>
      )}

      {open ? (
        <form onSubmit={criar} className="space-y-2 rounded-3xl bg-surface p-4 shadow-card">
          <p className="text-[13px] font-semibold text-ink-400">Novo consórcio</p>
          <input autoFocus placeholder="Nome (ex: Carro cota 1)" value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          <div className="grid grid-cols-2 gap-2">
            <MoneyInput placeholder="Valor da carta" value={carta} onValueChange={setCarta} className={inputCls} />
            <input type="number" inputMode="decimal" step="0.01" placeholder="Taxa adm (%)" value={taxa} onChange={(e) => setTaxa(e.target.value)} className={inputCls} />
            <MoneyInput placeholder="Parcela atual" value={parcela} onValueChange={setParcela} className={inputCls} />
            <input type="number" inputMode="numeric" min={2} placeholder="Parcelas a vencer" value={restantes} onChange={(e) => setRestantes(e.target.value)} className={inputCls} />
            <input type="number" min={1} max={31} placeholder="Dia de vencimento" value={dia} onChange={(e) => setDia(e.target.value)} className={inputCls} />
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-[15px] text-ink-800">
            <input
              type="checkbox"
              checked={contemplado}
              onChange={(e) => setContemplado(e.target.checked)}
              className="h-5 w-5 shrink-0 rounded accent-accent"
            />
            Já foi contemplado (já tenho o bem)
          </label>
          <p className="caption px-1">
            A parcela de {monthLabel(hoje)} conta como a 1ª das parcelas a vencer.
          </p>
          {error && !lanceDe && <p className="text-xs font-medium text-coral-500">Erro: {error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={resetForm} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              Salvar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="btn-add"
        >
          + Adicionar consórcio
        </button>
      )}
      {error && !open && !lanceDe && <p className="px-1 text-xs font-medium text-coral-500">Erro: {error}</p>}
    </div>
  );
}
