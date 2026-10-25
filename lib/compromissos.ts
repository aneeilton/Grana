import { comprasPorCartao, saldoDevedorCartao } from "@/lib/cartoes";
import { currentCompetencia, shiftCompetencia } from "@/lib/format";
import { valoresEfetivosPorItem } from "@/lib/projection";
import type { Item, Lancamento } from "@/lib/types";

export type Compromissos = {
  /** saldo devedor de todos os cartões (fatura atual, parcelas e faturas futuras em aberto) */
  cartoes: number;
  /** despesas fixas ainda não pagas, do mês atual aos próximos 5 */
  fixas: number;
  /** despesas pontuais/parceladas/sazonais ainda não pagas, mesma janela */
  pontuais: number;
  total: number;
};

export const MESES_COMPROMISSO = 6;

/**
 * O que já está comprometido e sai do patrimônio líquido: saldo devedor
 * dos cartões + despesas fixas e pontuais em aberto dos próximos 6 meses.
 *
 * Sem contar nada duas vezes: faturas de cartão e compras feitas nos
 * cartões entram só pelo saldo devedor; parcelas de consórcio ficam de
 * fora (a cota contemplada já entra como dívida pelo saldo devedor dela,
 * e as não contempladas não são dívida ainda).
 */
export function calcularCompromissos(
  items: Item[],
  lancamentos: Lancamento[],
  hoje: string = currentCompetencia()
): Compromissos {
  const compras = comprasPorCartao(items);
  const efetivosHoje = valoresEfetivosPorItem(items, lancamentos, hoje);
  let cartoes = 0;
  for (const c of items) {
    if (!c.cartao) continue;
    cartoes += saldoDevedorCartao(c, compras.get(c.id), lancamentos, hoje);
  }

  let fixas = 0;
  let pontuais = 0;
  for (let i = 0; i < MESES_COMPROMISSO; i++) {
    const competencia = shiftCompetencia(hoje, i);
    const efetivos = i === 0 ? efetivosHoje : valoresEfetivosPorItem(items, lancamentos, competencia);
    for (const item of items) {
      if (item.tipo !== "despesa" || item.cartao || item.cartao_id || item.consorcio_id) continue;
      const ef = efetivos.get(item.id);
      if (!ef || ef.pago) continue;
      if (item.fixo) fixas += ef.valor;
      else pontuais += ef.valor;
    }
  }

  return { cartoes, fixas, pontuais, total: cartoes + fixas + pontuais };
}
