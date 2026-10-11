"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark, RefreshCw, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TopHeader } from "@/components/TopHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import { formatMoney } from "@/lib/format";
import type { Conta } from "@/lib/types";

export function ContasScreen({
  initialContas,
  initialContaPadraoId,
  hideHeader,
  onTotaisChange,
}: {
  initialContas: Conta[];
  initialContaPadraoId: string | null;
  hideHeader?: boolean;
  onTotaisChange?: (totalCorrente: number, totalAplicado: number) => void;
}) {
  const supabase = createClient();
  const [contas, setContas] = useState(initialContas);
  const [contaPadraoId, setContaPadraoId] = useState(initialContaPadraoId);
  const [savingPadrao, setSavingPadrao] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [corrente, setCorrente] = useState("");
  const [aplicado, setAplicado] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);
  const [novoCorrente, setNovoCorrente] = useState("");
  const [novoAplicado, setNovoAplicado] = useState("");
  const [atualizando, setAtualizando] = useState(false);
  const [atualizacaoErro, setAtualizacaoErro] = useState<string | null>(null);

  const totalCorrente = useMemo(
    () => contas.reduce((sum, c) => sum + Number(c.saldo_corrente), 0),
    [contas]
  );
  const totalAplicado = useMemo(
    () => contas.reduce((sum, c) => sum + Number(c.saldo_aplicado), 0),
    [contas]
  );

  useEffect(() => {
    onTotaisChange?.(totalCorrente, totalAplicado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCorrente, totalAplicado]);

  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setNome("");
    setCorrente("");
    setAplicado("");
    setError(null);
  }

  function startEdit(conta: Conta) {
    setEditingId(conta.id);
    setNome(conta.nome);
    setCorrente(String(conta.saldo_corrente));
    setAplicado(String(conta.saldo_aplicado));
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    setError(null);

    if (editingId) {
      const { data, error } = await supabase
        .from("contas")
        .update({
          nome: nome.trim(),
          saldo_corrente: Number(corrente || 0),
          saldo_aplicado: Number(aplicado || 0),
        })
        .eq("id", editingId)
        .select()
        .single();
      setSaving(false);
      if (error) return setError(error.message);
      setContas((prev) => prev.map((c) => (c.id === editingId ? (data as Conta) : c)));
      closeForm();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("contas")
      .insert({
        user_id: user!.id,
        nome: nome.trim(),
        saldo_corrente: Number(corrente || 0),
        saldo_aplicado: Number(aplicado || 0),
      })
      .select()
      .single();
    setSaving(false);
    if (error) return setError(error.message);
    setContas((prev) => [...prev, data as Conta]);
    closeForm();
  }

  // Atualização rápida: só os saldos, direto no card da conta, sem abrir
  // o formulário completo de edição.
  function iniciarAtualizacao(conta: Conta) {
    setAtualizandoId(conta.id);
    setNovoCorrente(String(conta.saldo_corrente));
    setNovoAplicado(String(conta.saldo_aplicado));
    setAtualizacaoErro(null);
  }

  function fecharAtualizacao() {
    setAtualizandoId(null);
    setAtualizacaoErro(null);
  }

  async function salvarAtualizacao(e: React.FormEvent) {
    e.preventDefault();
    if (!atualizandoId) return;
    setAtualizando(true);
    setAtualizacaoErro(null);
    const { data, error } = await supabase
      .from("contas")
      .update({
        saldo_corrente: Number(novoCorrente || 0),
        saldo_aplicado: Number(novoAplicado || 0),
      })
      .eq("id", atualizandoId)
      .select()
      .single();
    setAtualizando(false);
    if (error || !data) return setAtualizacaoErro(error?.message ?? "Falha ao salvar");
    setContas((prev) => prev.map((c) => (c.id === atualizandoId ? (data as Conta) : c)));
    fecharAtualizacao();
  }

  async function removeConta(id: string) {
    setContas((prev) => prev.filter((c) => c.id !== id));
    await supabase.from("contas").delete().eq("id", id);
  }

  async function definirPadrao(id: string) {
    setSavingPadrao(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingPadrao(false);
      return;
    }
    const { error } = await supabase
      .from("config")
      .update({ conta_padrao_id: id })
      .eq("user_id", user.id);
    setSavingPadrao(false);
    if (!error) setContaPadraoId(id);
  }

  return (
    <div>
      {hideHeader ? (
        <p className="px-4 pb-2 text-sm text-ink-500">
          Saldo total ·{" "}
          <span className="font-bold text-ink-800">{formatMoney(totalCorrente + totalAplicado)}</span>
        </p>
      ) : (
        <TopHeader
          icon={Landmark}
          title="Contas"
          subtitle={`Saldo total ${formatMoney(totalCorrente + totalAplicado)}`}
        />
      )}

      <div className="space-y-4 px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-sky-500/10 text-sky-500">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
              Em conta
            </p>
            <p className="text-lg font-extrabold">{formatMoney(totalCorrente)}</p>
          </Card>
          <Card className="bg-grape-500/10 text-grape-500">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
              Aplicado
            </p>
            <p className="text-lg font-extrabold">{formatMoney(totalAplicado)}</p>
          </Card>
        </div>

        {contas.length === 0 ? (
          <EmptyState icon={Landmark} title="Nenhuma conta ainda" hint="Adicione seu primeiro banco ou carteira" />
        ) : (
          <div className="space-y-2">
            <p className="px-1 text-[11px] text-ink-400">
              Toque na estrela para escolher a conta padrão: é nela que entram e saem os valores
              quando você marca um lançamento como pago/recebido.
            </p>
            {contas.map((conta) => (
              <Card
                key={conta.id}
                className={`cursor-pointer ${atualizandoId === conta.id ? "ring-2 ring-brand-400" : ""}`}
                onClick={() => {
                  if (atualizandoId !== conta.id) startEdit(conta);
                }}
              >
                <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!savingPadrao) definirPadrao(conta.id);
                    }}
                    aria-label="Definir como conta padrão"
                    className={`shrink-0 ${conta.id === contaPadraoId ? "text-sun-500" : "text-ink-100 hover:text-sun-400"}`}
                  >
                    <Star size={18} strokeWidth={2} fill={conta.id === contaPadraoId ? "currentColor" : "none"} />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-800">{conta.nome}</p>
                    <p className="text-xs text-ink-400">
                      Aplicado: {formatMoney(Number(conta.saldo_aplicado))}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (atualizandoId === conta.id) fecharAtualizacao();
                      else iniciarAtualizacao(conta);
                    }}
                    aria-label="Atualizar saldo"
                    className="flex items-center gap-1 rounded-xl px-1.5 py-0.5 font-extrabold text-brand-700 hover:bg-brand-50"
                  >
                    {formatMoney(Number(conta.saldo_corrente))}
                    <RefreshCw size={13} strokeWidth={2.5} className="opacity-60" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeConta(conta.id);
                    }}
                    className="text-ink-400 hover:text-coral-500"
                    aria-label="Remover conta"
                  >
                    <X size={16} strokeWidth={2.25} />
                  </button>
                </div>
                </div>

                {atualizandoId === conta.id && (
                  <form
                    onSubmit={salvarAtualizacao}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 space-y-2 border-t border-ink-100 pt-3"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
                      Atualizar saldo
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1">
                        <span className="px-1 text-[11px] font-semibold text-ink-500">Em conta</span>
                        <input
                          autoFocus
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={novoCorrente}
                          onChange={(e) => setNovoCorrente(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="px-1 text-[11px] font-semibold text-ink-500">Aplicado</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={novoAplicado}
                          onChange={(e) => setNovoAplicado(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400"
                        />
                      </label>
                    </div>
                    {(() => {
                      const diff =
                        Number(novoCorrente || 0) + Number(novoAplicado || 0) -
                        Number(conta.saldo_corrente) - Number(conta.saldo_aplicado);
                      if (Math.abs(diff) < 0.005) return null;
                      return (
                        <p className={`px-1 text-[11px] font-semibold ${diff > 0 ? "text-brand-700" : "text-coral-500"}`}>
                          {diff > 0 ? "+" : "−"}
                          {formatMoney(Math.abs(diff))} em relação ao saldo anterior
                        </p>
                      );
                    })()}
                    {atualizacaoErro && (
                      <p className="text-xs font-medium text-coral-500">Erro: {atualizacaoErro}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={fecharAtualizacao}
                        className="flex-1 rounded-2xl bg-ink-100 py-2.5 text-sm font-semibold text-ink-700"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={atualizando}
                        className="flex-1 rounded-2xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
                      >
                        Atualizar
                      </button>
                    </div>
                  </form>
                )}
              </Card>
            ))}
          </div>
        )}

        {open ? (
          <form onSubmit={handleSubmit} className="space-y-2 rounded-3xl bg-white p-4 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
              {editingId ? "Editar conta" : "Nova conta"}
            </p>
            <input
              autoFocus
              placeholder="Nome do banco"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Saldo em conta"
                value={corrente}
                onChange={(e) => setCorrente(e.target.value)}
                className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Aplicado"
                value={aplicado}
                onChange={(e) => setAplicado(e.target.value)}
                className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
            {error && <p className="text-xs font-medium text-coral-500">Erro: {error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-2xl bg-ink-100 py-2.5 text-sm font-semibold text-ink-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full rounded-2xl border-2 border-dashed border-brand-300 py-3 text-sm font-bold text-brand-600"
          >
            + Adicionar conta
          </button>
        )}
      </div>
    </div>
  );
}
