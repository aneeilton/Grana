import { createClient } from "@/lib/supabase/server";
import { PatrimonioScreen } from "@/components/screens/PatrimonioScreen";
import { PageError } from "@/components/ui/PageError";
import { loadContaPadrao } from "@/lib/contaPadrao";
import { loadConsorcios } from "@/lib/consorcioData";
import { dividaConsorcios, resumirConsorcios } from "@/lib/consorcios";
import { currentCompetencia } from "@/lib/format";
import type { Bem, Divida } from "@/lib/types";

export default async function PatrimonioPage() {
  const supabase = createClient();
  const [
    { contas, contaPadraoId },
    { data: dividas, error: dividasError },
    { data: bens, error: bensError },
    consorcios,
  ] =
    await Promise.all([
      loadContaPadrao(),
      supabase.from("dividas").select("*").order("created_at", { ascending: true }),
      supabase.from("bens").select("*").order("created_at", { ascending: true }),
      loadConsorcios(),
    ]);

  if (dividasError) return <PageError error={dividasError} />;
  if (bensError) return <PageError error={bensError} />;

  return (
    <PatrimonioScreen
      initialContas={contas}
      initialContaPadraoId={contaPadraoId}
      initialDividas={(dividas ?? []) as Divida[]}
      initialBens={(bens ?? []) as Bem[]}
      dividaConsorcio={dividaConsorcios(
        resumirConsorcios(consorcios.consorcios, consorcios.items, consorcios.lancamentos, currentCompetencia())
      )}
    />
  );
}
