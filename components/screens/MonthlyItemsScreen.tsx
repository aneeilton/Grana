"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CreditCard, Pencil, Receipt, Repeat, Trash2, TrendingUp, Wallet } from "@/components/ui/icons";
import { createClient } from "@/lib/supabase/client";
import { TopHeader } from "@/components/TopHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { MES_INICIAL, currentCompetencia, formatMoney, monthLabel, monthYearLabel, shiftCompetencia } from "@/lib/format";
import { ehSazonal, ocorreNoMes, valoresEfetivosPorItem } from "@/lib/projection";
import { comprasPorCartao, inicioDoPlano, rotuloParcela, saldoDevedorCartao, totalComprasNoMes } from "@/lib/cartoes";
import type { Conta, Item, ItemTipo, Lancamento } from "@/lib/types";

type Tone = "brand" | "sky" | "sun" | "coral" | "grape";

const TONE_CLASSES: Record<Tone, { chip: string; value: string; dash: string }> = {
  brand: { chip: "bg-brand-500", value: "text-ink-900", dash: "" },
  sky: { chip: "bg-sky-400", value: "text-ink-900", dash: "" },
  sun: { chip: "bg-sun-400", value: "text-ink-900", dash: "" },
  coral: { chip: "bg-coral-400", value: "text-ink-900", dash: "" },
  grape: { chip: "bg-grape-400", value: "text-ink-900", dash: "" },
};

// O icone e derivado do tipo aqui dentro (nao recebido via prop) porque
// esse componente e montado a partir de Server Components: referencia de
// componente nao atravessa a fronteira server/client de forma serializavel.
const TIPO_ICON = {
  receita: TrendingUp,
  despesa: Wallet,
} as const;

function itemIcon(tipo: ItemTipo, fixo: boolean, cartao: boolean) {
  if (tipo === "receita") return TrendingUp;
  if (cartao) return CreditCard;
  return fixo ? Repeat : Receipt;
}

const MESES_ANO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type SaveState = "idle" | "saving" | "saved" | "error";

export function MonthlyItemsScreen({
  tipo,
  title,
  tone,
  valueDoneLabel,
  showDia,
  showExpectativa,
  initialItems,
  initialLancamentos,
  initialContas,
  contaPadraoId,
  hideHeader,
  onContasChange,
  onItemsChange,
  onLancamentosChange,
}: {
  tipo: ItemTipo;
  title: string;
  tone: Tone;
  valueDoneLabel: string;
  showDia: boolean;
  showExpectativa: boolean;
  initialItems: Item[];
  initialLancamentos: Lancamento[];
  initialContas: Conta[];
  contaPadraoId: string | null;
  hideHeader?: boolean;
  onContasChange?: (contas: Conta[]) => void;
  onItemsChange?: (items: Item[]) => void;
  onLancamentosChange?: (lancamentos: Lancamento[]) => void;
}) {
  const supabase = createClient();
  const tones = TONE_CLASSES[tone];
  const icon = TIPO_ICON[tipo];
  const [items, setItems] = useState(initialItems);
  const [contas, setContas] = useState(initialContas);
  const [competencia, setCompetencia] = useState(currentCompetencia());
  // Historico completo (todas as competencias), nao so a selecionada -- e o
  // que permite um item fixo "puxar" seu valor pra frente em meses sem
  // lancamento proprio (ver lib/projection.valoresEfetivosPorItem). Uma
  // unica busca no mount; navegar entre meses e so recalculo local, sem
  // round-trip ao Supabase.
  const [todosLancamentos, setTodosLancamentos] = useState<Lancamento[]>(initialLancamentos);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [dia, setDia] = useState("");
  const [expectativa, setExpectativa] = useState(false);
  const [fixo, setFixo] = useState(false);
  const [cartao, setCartao] = useState(false);
  const [limite, setLimite] = useState("");
  const [parcelas, setParcelas] = useState("");
  const [parcelaAtual, setParcelaAtual] = useState("");
  const [cartaoId, setCartaoId] = useState("");
  const [valorCompra, setValorCompra] = useState("");
  const [sazonal, setSazonal] = useState(false);
  const [mesesSazonal, setMesesSazonal] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    onContasChange?.(contas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contas]);

  useEffect(() => {
    onItemsChange?.(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    onLancamentosChange?.(todosLancamentos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todosLancamentos]);

  // Lancamento real (linha propria) do mes selecionado -- controla o botao
  // de pago/pendente e o que "isDirty" compara contra.
  const lancamentos = useMemo(() => {
    const map: Record<string, Lancamento> = {};
    for (const l of todosLancamentos) {
      if (l.competencia === competencia) map[l.item_id] = l;
    }
    return map;
  }, [todosLancamentos, competencia]);

  // Valor "vigente" de cada item no mes selecionado: o lancamento real, ou
  // -- pra item fixo sem lancamento nesse mes -- o valor do ultimo mes
  // lancado, repetido pra frente.
  const efetivos = useMemo(
    () => valoresEfetivosPorItem(items, todosLancamentos, competencia),
    [items, todosLancamentos, competencia]
  );

  // Uso do limite do cartao e sempre em relacao ao mes atual de verdade,
  // nao ao mes que o usuario esta navegando no seletor -- senao o
  // percentual mudava so por folhear meses passados/futuros no Fluxo.
  const competenciaHoje = useMemo(() => currentCompetencia(), []);
  const efetivosHoje = useMemo(
    () => valoresEfetivosPorItem(items, todosLancamentos, competenciaHoje),
    [items, todosLancamentos, competenciaHoje]
  );

  useEffect(() => {
    const novosDrafts: Record<string, string> = {};
    for (const item of items) {
      const efetivo = efetivos.get(item.id);
      novosDrafts[item.id] = efetivo ? String(efetivo.valor) : "";
    }
    setDrafts(novosDrafts);
    setSaveState({});
    setSaveErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competencia]);

  const total = useMemo(() => {
    let soma = 0;
    for (const efetivo of efetivos.values()) soma += efetivo.valor;
    return soma;
  }, [efetivos]);

  // Um item parcelado (fixo=false, parcelas_total definido) so tem linha
  // propria de lancamento nos meses do seu plano -- nao cai em "fixo"
  // (nao repete pra sempre) nem em "competencia_unica" (nao e so 1 mes),
  // entao precisa aparecer quando ha lancamento explicito pra esse mes.
  // Compras lançadas num cartão nao aparecem soltas na lista: entram
  // dentro do card do cartao, somando na fatura (ver renderItem).
  const itemsVisiveis = useMemo(
    () =>
      items.filter(
        (i) =>
          !i.cartao_id &&
          (i.fixo ||
            ocorreNoMes(i, competencia) ||
            (!ehSazonal(i) && i.competencia_unica === competencia) ||
            lancamentos[i.id] !== undefined ||
            (i.parcelas_total != null && rotuloParcela(i, todosLancamentos, competencia) !== null))
      ),
    [items, competencia, lancamentos, todosLancamentos]
  );

  const cartoesCadastrados = useMemo(() => items.filter((i) => i.cartao), [items]);
  const compras = useMemo(() => comprasPorCartao(items), [items]);

  function ordenarPorPendente(lista: Item[]) {
    return [...lista].sort(
      (a, b) => Number(lancamentos[a.id]?.pago ?? false) - Number(lancamentos[b.id]?.pago ?? false)
    );
  }

  const itemsCartoes = useMemo(
    () => ordenarPorPendente(itemsVisiveis.filter((i) => i.cartao)),
    [itemsVisiveis, lancamentos]
  );
  const itemsFixos = useMemo(
    () => ordenarPorPendente(itemsVisiveis.filter((i) => i.fixo && !i.cartao)),
    [itemsVisiveis, lancamentos]
  );
  const itemsParcelados = useMemo(
    () => ordenarPorPendente(itemsVisiveis.filter((i) => !i.consorcio_id && !i.fixo && !ehSazonal(i) && i.parcelas_total)),
    [itemsVisiveis, lancamentos]
  );
  const itemsConsorcio = useMemo(
    () => ordenarPorPendente(itemsVisiveis.filter((i) => i.consorcio_id)),
    [itemsVisiveis, lancamentos]
  );
  const itemsSazonais = useMemo(
    () => ordenarPorPendente(itemsVisiveis.filter((i) => ehSazonal(i))),
    [itemsVisiveis, lancamentos]
  );
  const itemsPontuais = useMemo(
    () => ordenarPorPendente(itemsVisiveis.filter((i) => !i.consorcio_id && !i.fixo && !ehSazonal(i) && !i.parcelas_total)),
    [itemsVisiveis, lancamentos]
  );

  // Resumo do mês selecionado (card colorido no topo): cada item com o
  // valor do mês -- cartão já somando as compras/parcelas da fatura --
  // e quanto já foi pago/recebido.
  const resumoMes = useMemo(() => {
    const linhas = itemsVisiveis
      .map((i) => ({
        id: i.id,
        nome: i.nome,
        valor: (efetivos.get(i.id)?.valor ?? 0) + (i.cartao ? totalComprasNoMes(compras.get(i.id), efetivos) : 0),
        feito: lancamentos[i.id]?.pago ?? false,
      }))
      .filter((l) => l.valor > 0)
      .sort((a, b) => b.valor - a.valor);
    const feito = linhas.filter((l) => l.feito).reduce((s, l) => s + l.valor, 0);
    const total = linhas.reduce((s, l) => s + l.valor, 0);
    return { linhas, feito, total };
  }, [itemsVisiveis, efetivos, compras, lancamentos]);

  function isDirty(item: Item) {
    // Compara contra o valor VIGENTE (real ou herdado do ultimo mes), nao
    // so contra a linha real deste mes -- senao todo item fixo aparecia
    // como "precisa salvar" so por nao ter lancamento proprio ainda neste
    // mes, mesmo repetindo exatamente o valor de sempre.
    const draft = drafts[item.id] ?? "";
    const vigente = efetivos.get(item.id)?.valor ?? 0;
    return Number(draft || 0) !== vigente;
  }

  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setNome("");
    setDia("");
    setExpectativa(false);
    setFixo(false);
    setCartao(false);
    setLimite("");
    setParcelas("");
    setParcelaAtual("");
    setCartaoId("");
    setSazonal(false);
    setMesesSazonal([]);
    setValorCompra("");
    setFormError(null);
  }

  function startEdit(item: Item) {
    setEditingId(item.id);
    setNome(item.nome);
    setDia(item.dia_vencimento ? String(item.dia_vencimento) : "");
    setExpectativa(item.expectativa);
    setFixo(item.fixo);
    setCartao(item.cartao);
    setLimite(item.limite != null ? String(item.limite) : "");
    setParcelas(item.parcelas_total != null ? String(item.parcelas_total) : "");
    setParcelaAtual(rotuloParcela(item, todosLancamentos, competencia)?.split("/")[0] ?? "");
    setCartaoId(item.cartao_id ?? "");
    setSazonal(ehSazonal(item));
    setMesesSazonal(item.meses_recorrencia ?? []);
    setValorCompra(item.cartao_id ? String(efetivos.get(item.id)?.valor ?? "") : "");
    setFormError(null);
    setOpen(true);
  }

  // Grava o valor de um item parcelado (ou compra no cartão) em cada mês
  // do plano, do mês `aPartirDe` em diante -- pulando parcelas já pagas
  // -- e apaga lançamentos pendentes que ficaram fora do plano (ex: o
  // número de parcelas diminuiu). Retorna a mensagem de erro, se houver.
  async function gravarPlano(item: Item, valor: number, aPartirDe: string, userId: string): Promise<string | null> {
    const doItem = todosLancamentos.filter((l) => l.item_id === item.id);
    const inicio = inicioDoPlano(item, doItem) ?? aPartirDe;
    const total = item.parcelas_total ?? 1;
    const fim = shiftCompetencia(inicio, total - 1);
    const porMes = new Map(doItem.map((l) => [l.competencia, l]));

    const linhas: { item_id: string; user_id: string; competencia: string; valor: number; pago: boolean }[] = [];
    for (let i = 0; i < total; i++) {
      const comp = shiftCompetencia(inicio, i);
      if (comp < aPartirDe) continue;
      const existente = porMes.get(comp);
      if (existente?.pago) continue;
      linhas.push({ item_id: item.id, user_id: userId, competencia: comp, valor, pago: false });
    }

    const foraDoPlano = doItem.filter((l) => !l.pago && (l.competencia < inicio || l.competencia > fim));
    if (foraDoPlano.length) {
      const ids = foraDoPlano.map((l) => l.id);
      const { error } = await supabase.from("lancamentos").delete().in("id", ids);
      if (error) return error.message;
      setTodosLancamentos((prev) => prev.filter((l) => !ids.includes(l.id)));
    }

    if (!linhas.length) return null;
    const { data, error } = await supabase
      .from("lancamentos")
      .upsert(linhas, { onConflict: "item_id,competencia" })
      .select();
    if (error || !data) return error?.message ?? "Falha ao salvar as parcelas";
    for (const linha of data as Lancamento[]) upsertLocal(linha);
    return null;
  }

  async function submitItem(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;

    // Cartão sempre é fixo: você sempre tem fatura desse cartão, só o
    // valor muda mês a mês.
    const fixoFinal = cartao ? true : fixo;
    // Anual/sazonal: não é fixo nem parcelado, repete só nos meses marcados.
    const sazonalFinal = !fixoFinal && sazonal && mesesSazonal.length > 0;
    if (!fixoFinal && sazonal && mesesSazonal.length === 0) {
      return setFormError("Escolha pelo menos um mês do ano");
    }
    // Parcelado: numero de parcelas so faz sentido pra item nao-fixo e
    // nao-cartao. competencia_unica marca o 1o mes do plano; os meses
    // seguintes aparecem via lancamento explicito, espelhado ao salvar o
    // valor (ver gravarPlano e itemsVisiveis).
    const parcelasFinal =
      !fixoFinal && !cartao && !sazonalFinal && parcelas && Number(parcelas) > 1 ? Number(parcelas) : null;
    // Compra lançada num cartão: soma na fatura dele em cada mês do plano.
    const cartaoIdFinal = tipo === "despesa" && !fixoFinal && !sazonalFinal && cartaoId ? cartaoId : null;
    const valorCompraFinal = Number(valorCompra || 0);
    if (cartaoIdFinal && !(valorCompraFinal > 0)) {
      return setFormError(parcelasFinal ? "Informe o valor de cada parcela" : "Informe o valor da compra");
    }

    setSaving(true);
    setFormError(null);

    // Editando um item não-fixo, mantém o mês de início original (senão
    // editar no meio do plano "recomeçava" as parcelas no mês aberto).
    const editando = editingId ? items.find((i) => i.id === editingId) : undefined;
    // Parcelado já em andamento ("estou na 3ª de 10"): o plano começa
    // (n - 1) meses antes do mês aberto, pra contagem 3/10, 4/10... bater.
    const nParcelaAtual = parcelasFinal && parcelaAtual
      ? Math.min(parcelasFinal, Math.max(1, Math.floor(Number(parcelaAtual))))
      : null;
    const competenciaUnica = fixoFinal || sazonalFinal
      ? null
      : nParcelaAtual
        ? shiftCompetencia(competencia, -(nParcelaAtual - 1))
        : editando && !editando.fixo && editando.competencia_unica
          ? editando.competencia_unica
          : competencia;

    const campos = {
      nome: nome.trim(),
      dia_vencimento: showDia && dia ? Number(dia) : null,
      expectativa: showExpectativa ? expectativa : false,
      fixo: fixoFinal,
      competencia_unica: competenciaUnica,
      cartao: tipo === "despesa" ? cartao : false,
      limite: tipo === "despesa" && cartao && limite ? Number(limite) : null,
      parcelas_total: parcelasFinal,
      // só manda a coluna quando há (ou havia) cartão ligado -- assim o
      // resto continua salvando mesmo antes da migração 0010 no banco.
      ...(cartaoIdFinal || editando?.cartao_id ? { cartao_id: cartaoIdFinal } : {}),
      ...(sazonalFinal || editando?.meses_recorrencia?.length
        ? { meses_recorrencia: sazonalFinal ? [...mesesSazonal].sort((a, b) => a - b) : null }
        : {}),
    };

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return setFormError("Sessão não encontrada");
    }

    const { data, error } = editingId
      ? await supabase.from("items").update(campos).eq("id", editingId).select().single()
      : await supabase.from("items").insert({ ...campos, user_id: user.id, tipo }).select().single();
    if (error || !data) {
      setSaving(false);
      return setFormError(error?.message ?? "Falha ao salvar");
    }
    const salvo = data as Item;
    setItems((prev) => (editingId ? prev.map((i) => (i.id === editingId ? salvo : i)) : [...prev, salvo]));

    if (cartaoIdFinal) {
      const inicio = competenciaUnica ?? competencia;
      const planoErro = await gravarPlano(salvo, valorCompraFinal, competencia > inicio ? competencia : inicio, user.id);
      if (planoErro) {
        setSaving(false);
        return setFormError(`Item salvo, mas as parcelas não: ${planoErro}`);
      }
    }

    setSaving(false);
    closeForm();
  }

  async function removeItem(id: string) {
    // Exclusão não tem desfazer: confirma antes, dizendo o que vai junto.
    const alvo = items.find((i) => i.id === id);
    const qtdCompras = compras.get(id)?.length ?? 0;
    const aviso =
      `Excluir "${alvo?.nome ?? "item"}"?` +
      (qtdCompras ? `\n\nAs ${qtdCompras} compras/parcelas lançadas nesse cartão também serão excluídas.` : "") +
      "\n\nTodos os valores lançados dele somem dos meses e da projeção.";
    if (!window.confirm(aviso)) return;
    // Apagar um cartão apaga junto as compras ligadas a ele (cascade no banco).
    const removidos = new Set([id, ...(compras.get(id) ?? []).map((c) => c.id)]);
    setItems((prev) => prev.filter((i) => !removidos.has(i.id)));
    setTodosLancamentos((prev) => prev.filter((l) => !removidos.has(l.item_id)));
    await supabase.from("items").delete().eq("id", id);
  }

  function upsertLocal(lancamento: Lancamento) {
    setTodosLancamentos((prev) => {
      const found = prev.some((l) => l.id === lancamento.id);
      return found ? prev.map((l) => (l.id === lancamento.id ? lancamento : l)) : [...prev, lancamento];
    });
  }

  async function saveValor(item: Item) {
    const valor = Number(drafts[item.id] || 0);
    setSaveState((prev) => ({ ...prev, [item.id]: "saving" }));
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      setSaveState((prev) => ({ ...prev, [item.id]: "error" }));
      setSaveErrors((prev) => ({ ...prev, [item.id]: userError?.message ?? "Sessão não encontrada" }));
      return;
    }

    const existing = lancamentos[item.id];
    const linhas: {
      item_id: string;
      user_id: string;
      competencia: string;
      valor: number;
      pago: boolean;
    }[] = [
      {
        item_id: item.id,
        user_id: user.id,
        competencia,
        valor,
        pago: existing?.pago ?? false,
      },
    ];

    // Parcelado: espelha o mesmo valor nos proximos meses do plano,
    // pulando qualquer mes que ja esteja marcado como pago (parcela
    // encerrada, nao mexe mais nela).
    if (item.parcelas_total && item.parcelas_total > 1) {
      const porItem = new Map(todosLancamentos.filter((l) => l.item_id === item.id).map((l) => [l.competencia, l]));
      // vai ate o fim do plano (a partir do 1o mes), nao N meses a partir daqui
      const fimDoPlano = shiftCompetencia(inicioDoPlano(item, todosLancamentos) ?? competencia, item.parcelas_total - 1);
      for (let i = 1; shiftCompetencia(competencia, i) <= fimDoPlano; i++) {
        const comp = shiftCompetencia(competencia, i);
        const existenteFutura = porItem.get(comp);
        if (existenteFutura?.pago) continue;
        linhas.push({
          item_id: item.id,
          user_id: user.id,
          competencia: comp,
          valor,
          pago: false,
        });
      }
    }

    const { data, error } = await supabase
      .from("lancamentos")
      .upsert(linhas, { onConflict: "item_id,competencia" })
      .select();

    if (error || !data) {
      setSaveState((prev) => ({ ...prev, [item.id]: "error" }));
      setSaveErrors((prev) => ({ ...prev, [item.id]: error?.message ?? "Falha ao salvar" }));
      return;
    }

    for (const linha of data as Lancamento[]) upsertLocal(linha);
    const salva = (data as Lancamento[]).find((l) => l.competencia === competencia);
    setDrafts((prev) => ({ ...prev, [item.id]: String(salva?.valor ?? valor) }));
    setSaveState((prev) => ({ ...prev, [item.id]: "saved" }));
    setTimeout(() => {
      setSaveState((prev) => (prev[item.id] === "saved" ? { ...prev, [item.id]: "idle" } : prev));
    }, 1800);
  }

  async function ajustarSaldoConta(delta: number): Promise<string | null> {
    if (delta === 0 || !contaPadraoId) return null;
    const conta = contas.find((c) => c.id === contaPadraoId);
    if (!conta) return "Conta padrão não encontrada";
    const novoSaldo = Number(conta.saldo_corrente) + delta;
    const { data, error } = await supabase
      .from("contas")
      .update({ saldo_corrente: novoSaldo })
      .eq("id", contaPadraoId)
      .select()
      .single();
    if (error || !data) {
      return error?.message ?? "Falha ao atualizar saldo da conta";
    }
    setContas((prev) => prev.map((c) => (c.id === contaPadraoId ? (data as Conta) : c)));
    return null;
  }

  async function togglePago(item: Item) {
    const existing = lancamentos[item.id];
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const valor = existing?.valor ?? Number(drafts[item.id] || 0);
    const novoPago = !(existing?.pago ?? false);
    const { data, error } = await supabase
      .from("lancamentos")
      .upsert(
        {
          id: existing?.id,
          item_id: item.id,
          user_id: user.id,
          competencia,
          valor,
          pago: novoPago,
        },
        { onConflict: "item_id,competencia" }
      )
      .select()
      .single();
    if (error || !data) {
      setSaveErrors((prev) => ({ ...prev, [item.id]: error?.message ?? "Falha ao salvar" }));
      return;
    }
    upsertLocal(data as Lancamento);
    setDrafts((prev) => ({ ...prev, [item.id]: String((data as Lancamento).valor) }));

    // Fatura de cartão: as compras/parcelas do mês acompanham o pago da
    // fatura, e o valor delas também sai (ou volta) da conta padrão.
    let valorTotal = valor;
    if (item.cartao) {
      const doMes = (compras.get(item.id) ?? [])
        .map((c) => lancamentos[c.id])
        .filter((l): l is Lancamento => l !== undefined && l.pago !== novoPago);
      if (doMes.length) {
        const { data: atualizadas, error: comprasError } = await supabase
          .from("lancamentos")
          .update({ pago: novoPago })
          .in(
            "id",
            doMes.map((l) => l.id)
          )
          .select();
        if (comprasError || !atualizadas) {
          setSaveErrors((prev) => ({
            ...prev,
            [item.id]: `Fatura salva, mas as parcelas não: ${comprasError?.message ?? "falha ao salvar"}`,
          }));
        } else {
          for (const l of atualizadas as Lancamento[]) upsertLocal(l);
          valorTotal += doMes.reduce((s, l) => s + Number(l.valor), 0);
        }
      }
    }

    if (valorTotal > 0) {
      const sinal = tipo === "receita" ? 1 : -1;
      const saldoError = await ajustarSaldoConta(novoPago ? sinal * valorTotal : -sinal * valorTotal);
      if (saldoError) {
        setSaveErrors((prev) => ({
          ...prev,
          [item.id]: `Lançamento salvo, mas saldo não foi ajustado: ${saldoError}`,
        }));
      }
    }
  }

  function renderItem(item: Item) {
    const lanc = lancamentos[item.id];
    const dirty = isDirty(item);
    const state = saveState[item.id] ?? "idle";
    const ItemIcon = itemIcon(tipo, item.fixo, item.cartao);
    const inferido = !lanc && efetivos.get(item.id)?.inferido;
    // Limite usado = saldo devedor total do cartão (tudo em aberto, de
    // qualquer mês, inclusive parcelas e faturas futuras) -- igual à aba Cartões.
    const comprasDoCartao = item.cartao ? (compras.get(item.id) ?? []) : [];
    const comprasNoMes = comprasDoCartao
      .map((c) => ({ compra: c, valor: efetivos.get(c.id)?.valor ?? 0 }))
      .filter((c) => c.valor > 0);
    const totalComprasMes = totalComprasNoMes(comprasDoCartao, efetivos);
    const valorFaturaAtual = item.cartao
      ? saldoDevedorCartao(item, comprasDoCartao, todosLancamentos, competenciaHoje, efetivosHoje.get(item.id))
      : 0;
    const uso = item.cartao && item.limite ? Math.min(1, valorFaturaAtual / item.limite) : null;
    const usoCor =
      uso === null ? "" : uso >= 0.9 ? "bg-coral-500" : uso >= 0.7 ? "bg-sun-400" : "bg-brand-500";
    const meta = [
      showDia && item.dia_vencimento ? `Vence dia ${item.dia_vencimento}` : null,
      showExpectativa && item.expectativa ? "Expectativa" : null,
      ehSazonal(item)
        ? `${item.meses_recorrencia!.length === 1 ? "Anual" : "Sazonal"}: ${item.meses_recorrencia!
            .map((m) => MESES_ANO[m - 1])
            .join(", ")}`
        : null,
      item.parcelas_total ? `Parcela ${rotuloParcela(item, todosLancamentos, competencia) ?? `de ${item.parcelas_total}`}` : null,
    ].filter(Boolean);
    const chip = item.cartao ? "bg-grape-400" : tones.chip;
    return (
      <Card key={item.id}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`app-icon h-9 w-9 rounded-[10px] ${chip}`}>
              <ItemIcon size={19} weight="fill" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink-900">{item.nome}</p>
              {meta.length > 0 && <p className="caption truncate">{meta.join(" · ")}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 pr-1 pt-1">
            <button onClick={() => startEdit(item)} className="icon-btn text-accent hover:text-accent-700" aria-label={`Editar ${item.nome}`}>
              <Pencil size={17} strokeWidth={2} aria-hidden />
            </button>
            <button onClick={() => removeItem(item.id)} className="icon-btn hover:text-coral-500" aria-label={`Remover ${item.nome}`}>
              <Trash2 size={17} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Valor de {item.nome} em {monthLabel(competencia)}</span>
            <span aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-medium text-ink-400">
              R$
            </span>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={drafts[item.id] ?? ""}
              placeholder={comprasDoCartao.length > 0 ? "outros gastos" : "0,00"}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveValor(item);
              }}
              className={`field pl-10 font-semibold ${tones.value}`}
            />
          </label>
          {(dirty || state !== "idle") && (
            <button
              onClick={() => saveValor(item)}
              disabled={!dirty || state === "saving"}
              className={`btn shrink-0 px-3.5 ${state === "saved" ? "bg-brand-100 text-brand-700" : "bg-ink-900 text-ink-50"}`}
            >
              {state === "saved" && <Check size={15} strokeWidth={2.75} aria-hidden />}
              {state === "saving" ? "Salvando…" : state === "saved" ? "Salvo" : "Salvar"}
            </button>
          )}
          <button
            onClick={() => togglePago(item)}
            aria-pressed={!!lanc?.pago}
            className={`status-pill min-h-11 ${lanc?.pago ? "bg-brand-600 text-white" : "bg-sun-100 text-sun-500"}`}
          >
            {lanc?.pago && <Check size={15} strokeWidth={2.75} aria-hidden />}
            {lanc?.pago ? valueDoneLabel : "Pendente"}
          </button>
        </div>

        {uso !== null && (
          <div className="mt-3">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
              role="progressbar"
              aria-label="Uso do limite"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(uso * 100)}
            >
              <div className={`h-full rounded-full transition-[width] duration-500 ease-out-expo ${usoCor}`} style={{ width: `${uso * 100}%` }} />
            </div>
            <p className="caption mt-1.5">
              {Math.round(uso * 100)}% do limite de {formatMoney(item.limite ?? 0)}
              {comprasDoCartao.length > 0 && " · inclui parcelas a vencer"}
            </p>
          </div>
        )}

        {comprasNoMes.length > 0 && (
          <div className="mt-4 border-t border-ink-100 pt-3">
            <p className="group-label px-0 pb-1">Parcelas e compras nesta fatura</p>
            <ul className="divide-y divide-ink-100">
              {comprasNoMes.map(({ compra, valor }) => {
                const parcela = rotuloParcela(compra, todosLancamentos, competencia);
                return (
                  <li key={compra.id} className="flex min-h-11 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={`truncate text-[15px] ${
                          lancamentos[compra.id]?.pago ? "text-ink-400 line-through decoration-ink-200" : "text-ink-800"
                        }`}
                      >
                        {compra.nome}
                      </p>
                      {parcela && <p className="caption">Parcela {parcela}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[15px] font-semibold text-ink-900">{formatMoney(valor)}</span>
                      <button onClick={() => startEdit(compra)} className="icon-btn text-accent hover:text-accent-700" aria-label={`Editar ${compra.nome}`}>
                        <Pencil size={16} strokeWidth={2} aria-hidden />
                      </button>
                      <button onClick={() => removeItem(compra.id)} className="icon-btn hover:text-coral-500" aria-label={`Remover ${compra.nome}`}>
                        <Trash2 size={16} strokeWidth={2} aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-1 flex items-center justify-between gap-3 border-t border-ink-200 pt-2.5">
              <span className="caption">Fatura prevista · outros gastos + {formatMoney(totalComprasMes)} em parcelas</span>
              <span className="shrink-0 text-[15px] font-bold text-ink-900">
                {formatMoney(Number(drafts[item.id] || 0) + totalComprasMes)}
              </span>
            </div>
          </div>
        )}
        {inferido && (
          <p className="caption mt-2">
            Repete o último valor lançado{ehSazonal(item) ? " (da última vez que ocorreu)" : ""}. Só mexa se mudou.
          </p>
        )}
        {saveErrors[item.id] && (
          <p role="alert" className="mt-2 text-[13px] font-medium text-coral-500">
            Não foi possível salvar: {saveErrors[item.id]}
          </p>
        )}
      </Card>
    );
  }

  return (
    <div>
      {!hideHeader && (
        <TopHeader
          icon={icon}
          title={title}
          subtitle={`Total em ${monthLabel(competencia)} · ${formatMoney(total)}`}
        />
      )}

      <div className="space-y-4 px-4 pt-1">
        <MonthSelector competencia={competencia} onChange={setCompetencia} minCompetencia={MES_INICIAL} />

        {resumoMes.linhas.length > 0 && (
          <SummaryCard
            tone={tipo === "receita" ? "brand" : "coral"}
            title={`${tipo === "receita" ? "Receitas" : "Despesas"} de ${monthYearLabel(competencia)}`}
            value={formatMoney(resumoMes.total)}
            progress={resumoMes.total > 0 ? resumoMes.feito / resumoMes.total : 0}
            progressLabel={`${formatMoney(resumoMes.feito)} ${valueDoneLabel.toLowerCase()}s · ${
              resumoMes.total > 0 ? Math.round((resumoMes.feito / resumoMes.total) * 100) : 0
            }% · falta ${formatMoney(resumoMes.total - resumoMes.feito)}`}
            rowsTitle={`Por ${tipo === "receita" ? "receita" : "despesa"} no mês`}
            rows={resumoMes.linhas.map((l) => ({
              id: l.id,
              label: l.nome,
              value: formatMoney(l.valor),
              muted: l.feito,
              icon: l.feito ? <Check size={14} strokeWidth={2.75} className="shrink-0" aria-label="feito" /> : undefined,
            }))}
            totalLabel="Total do mês"
            totalValue={formatMoney(resumoMes.total)}
          />
        )}

        {!contaPadraoId && (
          <p className="caption px-1">
            Defina uma conta padrão em <Link href="/patrimonio" className="font-medium text-accent">Patrimônio</Link> para
            que marcar como {valueDoneLabel.toLowerCase()} atualize o saldo automaticamente.
          </p>
        )}

        {items.length === 0 ? (
          <EmptyState
            icon={icon}
            title={tipo === "receita" ? "Nenhuma receita ainda" : "Nenhuma despesa ainda"}
            hint={tipo === "receita" ? "Cadastre salário, pró-labore e outras entradas no botão abaixo." : "Cadastre contas fixas, cartões e compras no botão abaixo."}
          />
        ) : itemsVisiveis.length === 0 ? (
          <EmptyState icon={icon} title="Nada neste mês" hint="Itens pontuais só aparecem no mês em que ocorreram" />
        ) : (
          <div className="space-y-5">
            {itemsCartoes.length > 0 && (
              <div className="space-y-2">
                <h3 className="group-label">Cartões</h3>
                {itemsCartoes.map(renderItem)}
              </div>
            )}
            {itemsFixos.length > 0 && (
              <div className="space-y-2">
                <h3 className="group-label">Fixas</h3>
                {itemsFixos.map(renderItem)}
              </div>
            )}
            {itemsParcelados.length > 0 && (
              <div className="space-y-2">
                <h3 className="group-label">Parceladas</h3>
                {itemsParcelados.map(renderItem)}
              </div>
            )}
            {itemsConsorcio.length > 0 && (
              <div className="space-y-2">
                <h3 className="group-label">Consórcios</h3>
                {itemsConsorcio.map(renderItem)}
              </div>
            )}
            {itemsSazonais.length > 0 && (
              <div className="space-y-2">
                <h3 className="group-label">Anuais e sazonais</h3>
                {itemsSazonais.map(renderItem)}
              </div>
            )}
            {itemsPontuais.length > 0 && (
              <div className="space-y-2">
                <h3 className="group-label">Pontuais</h3>
                {itemsPontuais.map(renderItem)}
              </div>
            )}
          </div>
        )}

        {open ? (
          <form onSubmit={submitItem} className="space-y-3 rounded-3xl bg-surface p-4 shadow-card">
            <p className="section-title">
              {editingId ? "Editar item" : tipo === "receita" ? "Nova receita" : "Nova despesa"}
            </p>
            <input
              autoFocus
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="field"
            />
            {showDia && (
              <input
                type="number"
                min={1}
                max={31}
                placeholder="Dia de vencimento"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="field"
              />
            )}
            {tipo === "despesa" && (
              <>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-[15px] text-ink-800">
                  <input
                    type="checkbox"
                    checked={cartao}
                    onChange={(e) => {
                      setCartao(e.target.checked);
                      if (e.target.checked) setFixo(true);
                    }}
                    className="h-5 w-5 shrink-0 rounded accent-accent"
                  />
                  É um cartão de crédito
                </label>
                {cartao && (
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Limite do cartão (opcional)"
                    value={limite}
                    onChange={(e) => setLimite(e.target.value)}
                    className="field"
                  />
                )}
              </>
            )}
            <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-[15px] text-ink-800">
              <input
                type="checkbox"
                checked={fixo}
                disabled={cartao}
                onChange={(e) => setFixo(e.target.checked)}
                className="h-5 w-5 shrink-0 rounded accent-accent disabled:opacity-50"
              />
              É {tipo === "receita" ? "uma receita" : "uma despesa"} fixa (repete todo mês)
            </label>
            {!cartao && !fixo && (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-[15px] text-ink-800">
                <input
                  type="checkbox"
                  checked={sazonal}
                  onChange={(e) => {
                    setSazonal(e.target.checked);
                    if (e.target.checked && mesesSazonal.length === 0) {
                      setMesesSazonal([Number(competencia.slice(5, 7))]);
                    }
                  }}
                  className="h-5 w-5 shrink-0 rounded accent-accent"
                />
                Repete só em alguns meses do ano (anual/sazonal)
              </label>
            )}
            {!cartao && !fixo && sazonal && (
              <div className="grid grid-cols-6 gap-1.5">
                {MESES_ANO.map((rotulo, idx) => {
                  const mes = idx + 1;
                  const on = mesesSazonal.includes(mes);
                  return (
                    <button
                      key={mes}
                      type="button"
                      onClick={() =>
                        setMesesSazonal((prev) => (on ? prev.filter((m) => m !== mes) : [...prev, mes]))
                      }
                      aria-pressed={on}
                      className={`min-h-11 rounded-xl text-[13px] font-semibold transition active:scale-95 ${
                        on ? "bg-accent text-white" : "bg-ink-100 text-ink-700"
                      }`}
                    >
                      {rotulo}
                    </button>
                  );
                })}
              </div>
            )}
            {!cartao && !fixo && !sazonal && (
              <input
                type="number"
                min={2}
                placeholder="Número de parcelas (opcional)"
                value={parcelas}
                onChange={(e) => setParcelas(e.target.value)}
                className="field"
              />
            )}
            {!cartao && !fixo && !sazonal && parcelas && Number(parcelas) > 1 && (
              <label className="block space-y-1">
                <span className="px-1 text-[11px] font-semibold text-ink-500">
                  Parcela de {monthLabel(competencia)} (deixe 1 se começa agora)
                </span>
                <input
                  type="number"
                  min={1}
                  max={Number(parcelas)}
                  inputMode="numeric"
                  placeholder="1"
                  value={parcelaAtual}
                  onChange={(e) => setParcelaAtual(e.target.value)}
                  className="field"
                />
              </label>
            )}
            {tipo === "despesa" && !cartao && !fixo && !sazonal && cartoesCadastrados.length > 0 && (
              <div className="space-y-2 rounded-2xl bg-grape-500/5 p-2">
                <label className="block space-y-1">
                  <span className="px-1 text-[11px] font-semibold text-ink-500">Vai na fatura de</span>
                  <select
                    value={cartaoId}
                    onChange={(e) => setCartaoId(e.target.value)}
                    className="field"
                  >
                    <option value="">Nenhum cartão (boleto, pix, débito)</option>
                    {cartoesCadastrados.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>
                {cartaoId && (
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder={parcelas && Number(parcelas) > 1 ? "Valor de cada parcela" : "Valor da compra"}
                    value={valorCompra}
                    onChange={(e) => setValorCompra(e.target.value)}
                    className="field"
                  />
                )}
              </div>
            )}
            {cartao ? (
              <p className="caption px-1">
                Cartão é sempre fixo: você sempre tem fatura, só o valor muda todo mês. Compras
                parceladas nele você lança como despesa nova, escolhendo o cartão em &quot;Vai na fatura de&quot;.
              </p>
            ) : fixo ? null : sazonal ? (
              <p className="caption px-1">
                {mesesSazonal.length === 1
                  ? `Anual: aparece todo ano em ${MESES_ANO[mesesSazonal[0] - 1]}, repetindo o último valor lançado.`
                  : mesesSazonal.length > 1
                    ? `Sazonal: aparece em ${[...mesesSazonal].sort((a, b) => a - b).map((m) => MESES_ANO[m - 1]).join(", ")}, repetindo o último valor lançado.`
                    : "Escolha os meses do ano em que ela acontece."}
              </p>
            ) : cartaoId ? (
              <p className="caption px-1">
                {parcelas && Number(parcelas) > 1
                  ? `Soma na fatura do ${cartoesCadastrados.find((c) => c.id === cartaoId)?.nome ?? "cartão"} por ${Number(parcelas)} meses`
                  : `Soma na fatura do ${cartoesCadastrados.find((c) => c.id === cartaoId)?.nome ?? "cartão"} só neste mês`}
                {valorCompra && Number(valorCompra) > 0 ? ` (${formatMoney(Number(valorCompra))} por mês)` : ""}.
              </p>
            ) : parcelas && Number(parcelas) > 1 ? (
              <p className="caption px-1">
                Ao salvar o valor, ele se repete automaticamente pelas próximas {Number(parcelas) - 1} mês(es).
              </p>
            ) : (
              <p className="caption px-1">
                Sem marcar, fica pontual: só aparece em {monthLabel(competencia)}.
              </p>
            )}
            {showExpectativa && (
              <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-[15px] text-ink-800">
                <input
                  type="checkbox"
                  checked={expectativa}
                  onChange={(e) => setExpectativa(e.target.checked)}
                  className="h-5 w-5 shrink-0 rounded accent-accent"
                />
                É uma expectativa (não garantido)
              </label>
            )}
            {formError && <p className="text-xs font-medium text-coral-500">Erro: {formError}</p>}
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
            className={`btn-add ${tones.dash}`}
          >
            + Adicionar
          </button>
        )}
      </div>
    </div>
  );
}
