"use client";

import { MoneyInput } from "@/components/ui/MoneyInput";
import { useEffect, useMemo, useState } from "react";
import { Gem, Trash2 } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { TopHeader } from "@/components/TopHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import { formatMoney } from "@/lib/format";
import type { Bem } from "@/lib/types";

export function BensScreen({
  initialBens,
  hideHeader,
  onTotalChange,
}: {
  initialBens: Bem[];
  hideHeader?: boolean;
  onTotalChange?: (total: number) => void;
}) {
  const supabase = createClient();
  const [bens, setBens] = useState(initialBens);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => bens.reduce((s, b) => s + Number(b.valor), 0), [bens]);

  useEffect(() => {
    onTotalChange?.(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setNome("");
    setValor("");
    setError(null);
  }

  function startEdit(bem: Bem) {
    setEditingId(bem.id);
    setNome(bem.nome);
    setValor(String(bem.valor));
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
        .from("bens")
        .update({ nome: nome.trim(), valor: Number(valor || 0) })
        .eq("id", editingId)
        .select()
        .single();
      setSaving(false);
      if (error) return setError(error.message);
      setBens((prev) => prev.map((b) => (b.id === editingId ? (data as Bem) : b)));
      closeForm();
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("bens")
      .insert({ user_id: user!.id, nome: nome.trim(), valor: Number(valor || 0) })
      .select()
      .single();
    setSaving(false);
    if (error) return setError(error.message);
    setBens((prev) => [...prev, data as Bem]);
    closeForm();
  }

  async function removeBem(id: string) {
    const alvo = bens.find((b) => b.id === id);
    if (!window.confirm(`Excluir o bem "${alvo?.nome ?? ""}"?`)) return;
    setBens((prev) => prev.filter((b) => b.id !== id));
    await supabase.from("bens").delete().eq("id", id);
  }

  return (
    <div>
      {hideHeader ? (
        <p className="sr-only">
          Total · <span className="font-bold text-ink-800">{formatMoney(total)}</span>
        </p>
      ) : (
        <TopHeader icon={Gem} title="Bens" subtitle={`Total ${formatMoney(total)}`} />
      )}

      <div className="space-y-4 px-4 pt-1">
        {bens.length === 0 ? (
          <EmptyState icon={Gem} title="Nenhum bem cadastrado" hint="Casa, carro, eletrônicos..." />
        ) : (
          <div className="space-y-2">
            {bens.map((bem) => (
              <Card
                key={bem.id}
                className="flex cursor-pointer items-center justify-between"
                onClick={() => startEdit(bem)}
              >
                <p className="font-semibold text-ink-800">{bem.nome}</p>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-grape-500">{formatMoney(Number(bem.valor))}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBem(bem.id);
                    }}
                    className="icon-btn hover:text-coral-500"
                    aria-label="Remover bem"
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
              {editingId ? "Editar bem" : "Novo bem"}
            </p>
            <input
              autoFocus
              placeholder="Nome do bem"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="field"
            />
            <MoneyInput
              placeholder="Valor estimado"
              value={valor}
              onValueChange={setValor}
              className="field"
            />
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
            + Adicionar bem
          </button>
        )}
      </div>
    </div>
  );
}
