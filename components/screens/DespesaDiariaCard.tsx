"use client";

import { useMemo, useState } from "react";
import { X } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { Card, SectionHeader } from "@/components/ui/Card";
import { CATEGORIAS_GASTO, categoriaIcon, categoriaLabel } from "@/lib/categoriasGasto";
import { formatMoney, monthLabel } from "@/lib/format";
import type { GastoDiario } from "@/lib/types";

export function DespesaDiariaCard({
  competencia,
  gastosDiarios,
  onChange,
}: {
  competencia: string;
  gastosDiarios: GastoDiario[];
  onChange: (updater: (prev: GastoDiario[]) => GastoDiario[]) => void;
}) {
  const supabase = createClient();
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_GASTO[0].id);
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doMes = useMemo(
    () =>
      gastosDiarios
        .filter((g) => `${g.data.slice(0, 7)}-01` === competencia)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [gastosDiarios, competencia]
  );

  const total = useMemo(() => doMes.reduce((s, g) => s + Number(g.valor), 0), [doMes]);

  async function addGasto(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(valor.replace(",", "."));
    if (!num || num <= 0) return;
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Sessão não encontrada");
      return;
    }
    const hoje = new Date();
    const data =
      competencia === `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`
        ? hoje.toISOString().slice(0, 10)
        : competencia;

    const { data: row, error } = await supabase
      .from("gastos_diarios")
      .insert({
        user_id: user.id,
        data,
        categoria,
        descricao: descricao.trim() || null,
        valor: num,
      })
      .select()
      .single();
    setSaving(false);
    if (error) return setError(error.message);
    onChange((prev) => [...prev, row as GastoDiario]);
    setValor("");
    setDescricao("");
  }

  async function remover(id: string) {
    onChange((prev) => prev.filter((g) => g.id !== id));
    await supabase.from("gastos_diarios").delete().eq("id", id);
  }

  return (
    <section>
      <SectionHeader
        title="Gastos do dia a dia"
        action={<span className="text-[15px] font-semibold text-coral-500">{formatMoney(total)}</span>}
      />
      <Card>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Categoria">
          {CATEGORIAS_GASTO.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={categoria === c.id}
              onClick={() => setCategoria(c.id)}
              className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition duration-150 active:scale-95 ${
                categoria === c.id ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200"
              }`}
            >
              <c.icon size={15} strokeWidth={2.25} aria-hidden />
              {c.label}
            </button>
          ))}
        </div>

        <form onSubmit={addGasto} className="mt-3 grid grid-cols-[6.5rem_1fr] gap-2">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Valor do gasto"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="field font-semibold text-coral-500"
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            aria-label="Descrição do gasto"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="field"
          />
          <button type="submit" disabled={saving} className="btn-primary col-span-2">
            {saving ? "Salvando…" : `Adicionar em ${categoriaLabel(categoria)}`}
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-2 text-[13px] font-medium text-coral-500">
            Não foi possível salvar: {error}
          </p>
        )}

        {doMes.length > 0 && (
          <div className="mt-4 border-t border-ink-100 pt-3">
            <p className="group-label px-0 pb-1">Em {monthLabel(competencia)}</p>
            <ul className="divide-y divide-ink-100">
              {doMes.slice(0, 6).map((g) => {
                const Icon = categoriaIcon(g.categoria);
                return (
                  <li key={g.id} className="flex min-h-11 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Icon size={16} strokeWidth={2} className="shrink-0 text-ink-400" aria-hidden />
                      <span className="truncate text-[15px] text-ink-800">
                        {g.descricao || categoriaLabel(g.categoria)}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-[15px] font-semibold text-ink-900">{formatMoney(Number(g.valor))}</span>
                      <button
                        onClick={() => remover(g.id)}
                        className="icon-btn hover:text-coral-500"
                        aria-label={`Remover gasto ${g.descricao || categoriaLabel(g.categoria)}`}
                      >
                        <X size={16} strokeWidth={2.25} aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {doMes.length > 6 && <p className="caption pt-2">+{doMes.length - 6} outros gastos este mês</p>}
          </div>
        )}
      </Card>
    </section>
  );
}
