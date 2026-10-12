import { createClient } from "@/lib/supabase/server";
import { FluxoScreen } from "@/components/screens/FluxoScreen";
import { PageError } from "@/components/ui/PageError";
import { loadContaPadrao } from "@/lib/contaPadrao";
import { loadConsorcios } from "@/lib/consorcioData";
import type { Item, Lancamento } from "@/lib/types";

async function loadTipo(tipo: "receita" | "despesa") {
  const supabase = createClient();
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .eq("tipo", tipo)
    .order("created_at", { ascending: true });

  if (itemsError) return { error: itemsError };

  const itemIds = (items ?? []).map((i) => i.id);
  // Busca o historico completo (nao so o mes atual): um item fixo precisa
  // do valor do ultimo mes lancado pra "puxar" pra frente em meses futuros
  // sem lancamento proprio (ver lib/projection.valoresEfetivosPorItem).
  const { data: lancamentos, error: lancError } = itemIds.length
    ? await supabase.from("lancamentos").select("*").in("item_id", itemIds)
    : { data: [], error: null };

  if (lancError) return { error: lancError };

  return { items: (items ?? []) as Item[], lancamentos: (lancamentos ?? []) as Lancamento[] };
}

export default async function FluxoPage() {
  const [receita, despesa] = await Promise.all([loadTipo("receita"), loadTipo("despesa")]);

  if (receita.error) return <PageError error={receita.error} />;
  if (despesa.error) return <PageError error={despesa.error} />;

  const [{ contas, contaPadraoId }, { consorcios }] = await Promise.all([loadContaPadrao(), loadConsorcios()]);

  return (
    <FluxoScreen
      receita={{ items: receita.items!, lancamentos: receita.lancamentos! }}
      despesa={{ items: despesa.items!, lancamentos: despesa.lancamentos! }}
      contas={contas}
      contaPadraoId={contaPadraoId}
      consorcios={consorcios}
    />
  );
}
