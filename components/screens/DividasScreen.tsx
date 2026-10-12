"use client";

import { useEffect, useMemo, useState } from "react";
import { FileWarning, PartyPopper, Trash2 } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { TopHeader } from "@/components/TopHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import { formatMoney } from "@/lib/format";
import type { Divida, DividaTipo } from "@/lib/types";

export function DividasScreen({
  initialDividas,
  dividaConsorcio = 0,
  hideHeader,
  onTotalChange,
}: {
  initialDividas: Divida[];
  dividaConsorcio?: number;
  hideHeader?: boolean;
  onTotalChange?: (total: number) => void;
}) {
  const supabase = createClient();
  const [dividas, setDividas] = useState(initialDividas);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState<DividaTipo>("curto");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCurto = useMemo(
    () => dividas.filter((d) => d.tipo === "curto").reduce((s, d) => s + Number(d.valor), 0),
    [dividas]
  );
  const totalLongo = useMemo(
    () => dividas.filter((d) => d.tipo === "longo").reduce((s, d) => s + Number(d.valor), 0),
    [dividas]
  );

  useEffect(() => {
    onTotalChange?.(totalCurto + totalLongo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalCurto, totalLongo]);

  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setNome("");
    setValor("");
    setTipo("curto");
    setError(null);
  }

  function startEdit(divida: Divida) {
    setEditingId(divida.id);
    setNome(divida.nome);
    setValor(String(divida.valor));
    setTipo(divida.tipo);
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
        .from("dividas")
        .update({ nome: nome.trim(), valor: Number(valor || 0), tipo })
        .eq("id", editingId)
        .select()
        .single();
      setSaving(false);
      if (error) return setError(error.message);
      setDividas((prev) => prev.map((d) => (d.id === editingId ? (data as Divida) : d)));
      closeForm();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("dividas")
      .insert({ user_id: user!.id, nome: nome.trim(), valor: Number(valor || 0), tipo })
      .select()
      .single();
    setSaving(false);
    if (error) return setError(error.message);
    setDividas((prev) => [...prev, data as Divida]);
    closeForm();
  }

  async function removeDivida(id: string) {
    const alvo = dividas.find((d) => d.id === id);
    if (!window.confirm(`Excluir a dívida "${alvo?.nome ?? ""}"?`)) return;
    setDividas((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("dividas").delete().eq("id", id);
  }

  return (
    <div>
      {hideHeader ? (
        <p className="sr-only">
          Total · <span className="font-bold text-ink-800">{formatMoney(totalCurto + totalLongo + dividaConsorcio)}</span>
        </p>
      ) : (
        <TopHeader
          icon={FileWarning}
          title="Dívidas"
          subtitle={`Total ${formatMoney(totalCurto + totalLongo + dividaConsorcio)}`}
        />
      )}

      <div className="space-y-4 px-4 pt-1">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3.5">
            <p className="text-[13px] font-medium text-ink-500">
              Curto prazo
            </p>
            <p className="mt-0.5 text-[17px] font-bold text-ink-900">{formatMoney(totalCurto)}</p>
          </Card>
          <Card className="p-3.5">
            <p className="text-[13px] font-medium text-ink-500">
              Longo prazo
            </p>
            <p className="mt-0.5 text-[17px] font-bold text-ink-900">{formatMoney(totalLongo + dividaConsorcio)}</p>
          </Card>
        </div>
        {dividaConsorcio > 0 && (
          <p className="caption px-1">
            Longo prazo inclui {formatMoney(dividaConsorcio)} de consórcio contemplado (parcelas em aberto),
            calculado automaticamente na aba Fluxo → Consórcio.
          </p>
        )}

        {dividas.length === 0 ? (
          <EmptyState icon={PartyPopper} title="Nenhuma dívida cadastrada" hint="Ótimo sinal!" />
        ) : (
          <div className="space-y-2">
            {dividas.map((divida) => (
              <Card
                key={divida.id}
                className="flex cursor-pointer items-center justify-between"
                onClick={() => startEdit(divida)}
              >
                <div>
                  <p className="font-semibold text-ink-800">{divida.nome}</p>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      divida.tipo === "curto"
                        ? "bg-coral-500/10 text-coral-500"
                        : "bg-sun-500/10 text-sun-500"
                    }`}
                  >
                    {divida.tipo === "curto" ? "Curto prazo" : "Longo prazo"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-ink-800">{formatMoney(Number(divida.valor))}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDivida(divida.id);
                    }}
                    className="icon-btn hover:text-coral-500"
                    aria-label="Remover dívida"
                  >
                    <Trash2 size={17} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {open ? (
          <form onSubmit={handleSubmit} className="space-y-2 rounded-3xl bg-surface p-4 shadow-card">
            <p className="text-[13px] font-semibold text-ink-400">
              {editingId ? "Editar dívida" : "Nova dívida"}
            </p>
            <input
              autoFocus
              placeholder="Nome da dívida"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="field"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="field"
              />
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as DividaTipo)}
                className="field"
              >
                <option value="curto">Curto prazo</option>
                <option value="longo">Longo prazo</option>
              </select>
            </div>
            {error && <p className="text-xs font-medium text-coral-500">Erro: {error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1"
              >
                Salvar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="btn-add"
          >
            + Adicionar dívida
          </button>
        )}
      </div>
    </div>
  );
}
