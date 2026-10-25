import type { Emprestimo, Item, Lancamento } from "@/lib/types";

export type ResumoEmprestimo = {
  emprestimo: Emprestimo;
  /** Despesa parcelada com as parcelas do empréstimo. */
  item: Item | null;
  /** Valor da parcela do mês atual (ou da próxima em aberto). */
  parcelaAtual: number;
  total: number;
  pagas: number;
  restantes: number;
  /** Soma das parcelas ainda não pagas. */
  saldoDevedor: number;
  /** Tudo que vai ser pago no fim (todas as parcelas). */
  totalPago: number;
  /** totalPago − valor recebido. */
  custo: number;
  primeiraCompetencia: string | null;
  ultimaCompetencia: string | null;
};

export function resumirEmprestimos(
  emprestimos: Emprestimo[],
  items: Item[],
  lancamentos: Lancamento[],
  competenciaHoje: string
): ResumoEmprestimo[] {
  return emprestimos.map((emprestimo) => {
    const item = items.find((i) => i.emprestimo_id === emprestimo.id) ?? null;
    const parcelas = item
      ? lancamentos.filter((l) => l.item_id === item.id).sort((a, b) => a.competencia.localeCompare(b.competencia))
      : [];
    const emAberto = parcelas.filter((l) => !l.pago);
    const doMes =
      parcelas.find((l) => l.competencia === competenciaHoje) ??
      emAberto.find((l) => l.competencia >= competenciaHoje) ??
      emAberto[0] ??
      parcelas[parcelas.length - 1];
    const totalPago = parcelas.reduce((s, l) => s + Number(l.valor), 0);
    return {
      emprestimo,
      item,
      parcelaAtual: doMes ? Number(doMes.valor) : 0,
      total: parcelas.length,
      pagas: parcelas.length - emAberto.length,
      restantes: emAberto.length,
      saldoDevedor: emAberto.reduce((s, l) => s + Number(l.valor), 0),
      totalPago,
      custo: totalPago - Number(emprestimo.valor),
      primeiraCompetencia: parcelas[0]?.competencia ?? null,
      ultimaCompetencia: parcelas[parcelas.length - 1]?.competencia ?? null,
    };
  });
}
