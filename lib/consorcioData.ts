import { createClient } from "@/lib/supabase/server";
import type { Consorcio, Item, Lancamento } from "@/lib/types";

/**
 * Consórcios + as despesas ligadas a eles e seus lançamentos. Tolerante
 * à tabela ainda não existir (antes da migração 0013): devolve vazio em
 * vez de quebrar a página.
 */
export async function loadConsorcios(): Promise<{ consorcios: Consorcio[]; items: Item[]; lancamentos: Lancamento[] }> {
  const supabase = createClient();
  const vazio = { consorcios: [], items: [], lancamentos: [] };
  const { data: consorcios, error } = await supabase
    .from("consorcios")
    .select("*")
    .order("created_at", { ascending: true });
  if (error || !consorcios?.length) return vazio;

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .in(
      "consorcio_id",
      consorcios.map((c) => c.id)
    );
  const ids = (items ?? []).map((i) => i.id);
  const { data: lancamentos } = ids.length
    ? await supabase.from("lancamentos").select("*").in("item_id", ids)
    : { data: [] };

  return {
    consorcios: consorcios as Consorcio[],
    items: (items ?? []) as Item[],
    lancamentos: (lancamentos ?? []) as Lancamento[],
  };
}
