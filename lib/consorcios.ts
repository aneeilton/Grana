import type { Consorcio, Item, Lancamento } from "@/lib/types";

export type ResumoConsorcio = {
  consorcio: Consorcio;
  /** Despesa parcelada com as parcelas do consórcio. */
  principal: Item | null;
  /** Despesa pontual do lance já aceito (pago com dinheiro próprio). */
  lanceItem: Item | null;
  /** Valor da parcela do mês atual (ou da próxima em aberto). */
  parcelaAtual: number;
  /** Parcelas ainda não pagas. */
  restantes: number;
  pagas: number;
  /** Soma das parcelas ainda não pagas. */
  saldoDevedor: number;
  ultimaCompetencia: string | null;
};

export function resumirConsorcios(
  consorcios: Consorcio[],
  items: Item[],
  lancamentos: Lancamento[],
  competenciaHoje: string
): ResumoConsorcio[] {
  return consorcios.map((consorcio) => {
    const ligados = items.filter((i) => i.consorcio_id === consorcio.id);
    const principal = ligados.find((i) => i.parcelas_total) ?? null;
    const lanceItem = ligados.find((i) => !i.parcelas_total) ?? null;
    const parcelas = principal
      ? lancamentos
          .filter((l) => l.item_id === principal.id)
          .sort((a, b) => a.competencia.localeCompare(b.competencia))
      : [];
    const emAberto = parcelas.filter((l) => !l.pago);
    const doMes =
      parcelas.find((l) => l.competencia === competenciaHoje) ??
      emAberto.find((l) => l.competencia >= competenciaHoje) ??
      emAberto[0] ??
      parcelas[parcelas.length - 1];
    return {
      consorcio,
      principal,
      lanceItem,
      parcelaAtual: doMes ? Number(doMes.valor) : 0,
      restantes: emAberto.length,
      pagas: parcelas.length - emAberto.length,
      saldoDevedor: emAberto.reduce((s, l) => s + Number(l.valor), 0),
      ultimaCompetencia: parcelas[parcelas.length - 1]?.competencia ?? null,
    };
  });
}

/** Dívida de consórcio pro patrimônio: só os contemplados (já tem o bem). */
export function dividaConsorcios(resumos: ResumoConsorcio[]): number {
  return resumos.filter((r) => r.consorcio.contemplado).reduce((s, r) => s + r.saldoDevedor, 0);
}
