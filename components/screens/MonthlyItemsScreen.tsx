"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CreditCard, Pencil, Receipt, Repeat, TrendingUp, Wallet, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TopHeader } from "@/components/TopHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import { MonthSelector } from "@/components/ui/MonthSelector";
import { MES_INICIAL, currentCompetencia, formatMoney, monthLabel, shiftCompetencia } from "@/lib/format";
import { ehSazonal, ocorreNoMes, valoresEfetivosPorItem } from "@/lib/projection";
import { comprasPorCartao, inicioDoPlano, rotuloParcela, saldoDevedorCartao, totalComprasNoMes } from "@/lib/cartoes";
import type { Conta, Item, ItemTipo, Lancamento } from "@/lib/types";

type Tone = "brand" | "sky" | "sun" | "coral" | "grape";

const TONE_CLASSES: Record<Tone, { chip: string; value: string; dash: string }> = {
  brand: { chip: "bg-brand-100 text-brand-700", value: "text-brand-700", dash: "border-brand-300 text-brand-600" },
  sky: { chip: "bg-sky-500/10 text-sky-500", value: "text-sky-500", dash: "border-sky-400 text-sky-500" },
  sun: { chip: "bg-sun-500/10 text-sun-500", value: "text-sun-500", dash: "border-sun-400 text-sun-500" },
  coral: { chip: "bg-coral-500/10 text-coral-500", value: "text-coral-500", dash: "border-coral-400 text-coral-500" },
  grape: { chip: "bg-grape-500/10 text-grape-500", value: "text-grape-500", dash: "border-grape-400 text-grape-500" },
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
    () => ordenarPorPendente(itemsVisiveis.filter((i) => !i.fixo && !ehSazonal(i) && i.parcelas_total)),
    [itemsVisiveis, lancamentos]
  );
  const itemsSazonais = useMemo(
    () => ordenarPorPendente(itemsVisiveis.filter((i) => ehSazonal(i))),
    [itemsVisiveis, lancamentos]
  );
  const itemsPontuais = useMemo(
    () => ordenarPorPendente(itemsVisiveis.filter((i) => !i.fixo && !ehSazonal(i) && !i.parcelas_total)),
    [itemsVisiveis, lancamentos]
  );

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
      uso === null ? "" : uso >= 0.9 ? "bg-coral-500" : uso >= 0.7 ? "bg-sun-500" : "bg-brand-600";
    return (
      <Card key={item.id}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${tones.chip}`}>
              <ItemIcon size={16} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink-800">{item.nome}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {showDia && item.dia_vencimento && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tones.chip}`}>
                    Vence dia {item.dia_vencimento}
                  </span>
                )}
                {showExpectativa && item.expectativa && (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-500">
                    Expectativa
                  </span>
                )}
                {ehSazonal(item) && (
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-500">
                    {item.meses_recorrencia!.length === 1 ? "Anual" : "Sazonal"} ·{" "}
                    {item.meses_recorrencia!.map((m) => MESES_ANO[m - 1]).join(", ")}
                  </span>
                )}
                {item.parcelas_total && (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-500">
                    {rotuloParcela(item, todosLancamentos, competencia) ?? `${item.parcelas_total}x`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => startEdit(item)}
              className="text-ink-400 hover:text-brand-600"
              aria-label="Editar"
            >
              <Pencil size={15} strokeWidth={2.25} />
            </button>
            <button
              onClick={() => removeItem(item.id)}
              className="text-ink-400 hover:text-coral-500"
              aria-label="Remover"
            >
              <X size={16} strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={drafts[item.id] ?? ""}
            placeholder={comprasDoCartao.length > 0 ? "Outros gastos do cartão" : "0,00"}
            onChange={(e) =>
              setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") saveValor(item);
            }}
            className={`w-full rounded-xl border border-ink-100 bg-ink-50 px-3 py-2 text-sm font-bold outline-none focus:border-brand-400 ${tones.value}`}
          />
          <button
            onClick={() => saveValor(item)}
            disabled={!dirty || state === "saving"}
            className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${
              state === "saved"
                ? "bg-brand-600 text-white"
                : dirty
                  ? "bg-ink-800 text-white"
                  : "bg-ink-100 text-ink-400"
            }`}
          >
            {state === "saved" && <Check size={13} strokeWidth={2.5} />}
            {state === "saving" ? "Salvando..." : state === "saved" ? "Salvo" : "Salvar"}
          </button>
          <button
            onClick={() => togglePago(item)}
            className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${
              lanc?.pago
                ? "bg-brand-600 text-white"
                : "bg-ink-100 text-ink-500"
            }`}
          >
            {lanc?.pago && <Check size={13} strokeWidth={2.5} />}
            {lanc?.pago ? valueDoneLabel : "Pendente"}
          </button>
        </div>
        {uso !== null && (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
              <div className={`h-full rounded-full ${usoCor}`} style={{ width: `${uso * 100}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-ink-400">
              {Math.round(uso * 100)}% do limite ({formatMoney(item.limite ?? 0)})
              {comprasDoCartao.length > 0 && " · inclui parcelas a vencer"}
            </p>
          </div>
        )}
        {comprasNoMes.length > 0 && (
          <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
              Parcelas e compras nesta fatura
            </p>
            {comprasNoMes.map(({ compra, valor }) => {
              const parcela = rotuloParcela(compra, todosLancamentos, competencia);
              return (
                <div key={compra.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <p className={`truncate font-semibold ${lancamentos[compra.id]?.pago ? "text-ink-400" : "text-ink-700"}`}>
                      {compra.nome}
                    </p>
                    {parcela && (
                      <span className="shrink-0 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
                        {parcela}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`font-bold [font-variant-numeric:tabular-nums] ${tones.value}`}>
                      {formatMoney(valor)}
                    </span>
                    <button
                      onClick={() => startEdit(compra)}
                      className="text-ink-400 hover:text-brand-600"
                      aria-label={`Editar ${compra.nome}`}
                    >
                      <Pencil size={13} strokeWidth={2.25} />
                    </button>
                    <button
                      onClick={() => removeItem(compra.id)}
                      className="text-ink-400 hover:text-coral-500"
                      aria-label={`Remover ${compra.nome}`}
                    >
                      <X size={14} strokeWidth={2.25} />
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-dashed border-ink-100 pt-1.5 text-xs">
              <span className="text-ink-500">
                Fatura prevista (outros gastos + {formatMoney(totalComprasMes)} em parcelas)
              </span>
              <span className="font-extrabold text-ink-800 [font-variant-numeric:tabular-nums]">
                {formatMoney(Number(drafts[item.id] || 0) + totalComprasMes)}
              </span>
            </div>
          </div>
        )}
        {inferido && (
          <p className="mt-1.5 text-[11px] text-ink-400">
            Repete automaticamente o último valor lançado{ehSazonal(item) ? " (da última vez que ocorreu)" : ""} · só mexa se o valor mudar
          </p>
        )}
        {saveErrors[item.id] && (
          <p className="mt-1.5 text-xs font-medium text-coral-500">
            Erro ao salvar: {saveErrors[item.id]}
          </p>
        )}
      </Card>
    );
  }

  return (
    <div>
      {hideHeader ? (
        <p className="px-4 pb-2 text-sm text-ink-500">
          Total em {monthLabel(competencia)} · <span className="font-bold text-ink-800">{formatMoney(total)}</span>
        </p>
      ) : (
        <TopHeader
          icon={icon}
          title={title}
          subtitle={`Total em ${monthLabel(competencia)} · ${formatMoney(total)}`}
        />
      )}

      <div className="space-y-4 px-4 pt-1">
        <MonthSelector competencia={competencia} onChange={setCompetencia} minCompetencia={MES_INICIAL} />

        {!contaPadraoId && (
          <p className="px-1 text-[11px] text-ink-400">
            Defina uma conta padrão em <Link href="/patrimonio" className="font-bold text-brand-600">Patrimônio</Link> para
            que marcar como {valueDoneLabel.toLowerCase()} atualize o saldo automaticamente.
          </p>
        )}

        {items.length === 0 ? (
          <EmptyState icon={icon} title="Nada por aqui ainda" hint="Adicione o primeiro item" />
        ) : itemsVisiveis.length === 0 ? (
          <EmptyState icon={icon} title="Nada neste mês" hint="Itens pontuais só aparecem no mês em que ocorreram" />
        ) : (
          <div className="space-y-4">
            {itemsCartoes.length > 0 && (
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">Cartões</p>
                {itemsCartoes.map(renderItem)}
              </div>
            )}
            {itemsFixos.length > 0 && (
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">Fixas</p>
                {itemsFixos.map(renderItem)}
              </div>
            )}
            {itemsParcelados.length > 0 && (
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">Parceladas</p>
                {itemsParcelados.map(renderItem)}
              </div>
            )}
            {itemsSazonais.length > 0 && (
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">Anuais e sazonais</p>
                {itemsSazonais.map(renderItem)}
              </div>
            )}
            {itemsPontuais.length > 0 && (
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">Pontuais</p>
                {itemsPontuais.map(renderItem)}
              </div>
            )}
          </div>
        )}

        {open ? (
          <form onSubmit={submitItem} className="space-y-2 rounded-3xl bg-white p-4 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
              {editingId ? "Editar" : "Novo item"}
            </p>
            <input
              autoFocus
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
            />
            {showDia && (
              <input
                type="number"
                min={1}
                max={31}
                placeholder="Dia de vencimento"
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
              />
            )}
            {tipo === "despesa" && (
              <>
                <label className="flex items-center gap-2 px-1 text-sm text-ink-600">
                  <input
                    type="checkbox"
                    checked={cartao}
                    onChange={(e) => {
                      setCartao(e.target.checked);
                      if (e.target.checked) setFixo(true);
                    }}
                    className="h-4 w-4 rounded accent-brand-600"
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
                    className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
                  />
                )}
              </>
            )}
            <label className="flex items-center gap-2 px-1 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={fixo}
                disabled={cartao}
                onChange={(e) => setFixo(e.target.checked)}
                className="h-4 w-4 rounded accent-brand-600 disabled:opacity-50"
              />
              É {tipo === "receita" ? "uma receita" : "uma despesa"} fixa (repete todo mês)
            </label>
            {!cartao && !fixo && (
              <label className="flex items-center gap-2 px-1 text-sm text-ink-600">
                <input
                  type="checkbox"
                  checked={sazonal}
                  onChange={(e) => {
                    setSazonal(e.target.checked);
                    if (e.target.checked && mesesSazonal.length === 0) {
                      setMesesSazonal([Number(competencia.slice(5, 7))]);
                    }
                  }}
                  className="h-4 w-4 rounded accent-brand-600"
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
                      className={`rounded-xl py-2 text-xs font-bold transition ${
                        on ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"
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
                className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
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
                  className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
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
                    className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-400"
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
                    className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-2.5 text-sm outline-none focus:border-brand-400"
                  />
                )}
              </div>
            )}
            {cartao ? (
              <p className="px-1 text-[11px] text-ink-400">
                Cartão é sempre fixo: você sempre tem fatura, só o valor muda todo mês. Compras
                parceladas nele você lança como despesa nova, escolhendo o cartão em &quot;Vai na fatura de&quot;.
              </p>
            ) : fixo ? null : sazonal ? (
              <p className="px-1 text-[11px] text-ink-400">
                {mesesSazonal.length === 1
                  ? `Anual: aparece todo ano em ${MESES_ANO[mesesSazonal[0] - 1]}, repetindo o último valor lançado.`
                  : mesesSazonal.length > 1
                    ? `Sazonal: aparece em ${[...mesesSazonal].sort((a, b) => a - b).map((m) => MESES_ANO[m - 1]).join(", ")}, repetindo o último valor lançado.`
                    : "Escolha os meses do ano em que ela acontece."}
              </p>
            ) : cartaoId ? (
              <p className="px-1 text-[11px] text-ink-400">
                {parcelas && Number(parcelas) > 1
                  ? `Soma na fatura do ${cartoesCadastrados.find((c) => c.id === cartaoId)?.nome ?? "cartão"} por ${Number(parcelas)} meses`
                  : `Soma na fatura do ${cartoesCadastrados.find((c) => c.id === cartaoId)?.nome ?? "cartão"} só neste mês`}
                {valorCompra && Number(valorCompra) > 0 ? ` (${formatMoney(Number(valorCompra))} por mês)` : ""}.
              </p>
            ) : parcelas && Number(parcelas) > 1 ? (
              <p className="px-1 text-[11px] text-ink-400">
                Ao salvar o valor, ele se repete automaticamente pelas próximas {Number(parcelas) - 1} mês(es).
              </p>
            ) : (
              <p className="px-1 text-[11px] text-ink-400">
                Sem marcar, fica pontual: só aparece em {monthLabel(competencia)}.
              </p>
            )}
            {showExpectativa && (
              <label className="flex items-center gap-2 px-1 text-sm text-ink-600">
                <input
                  type="checkbox"
                  checked={expectativa}
                  onChange={(e) => setExpectativa(e.target.checked)}
                  className="h-4 w-4 rounded accent-brand-600"
                />
                É uma expectativa (não garantido)
              </label>
            )}
            {formError && <p className="text-xs font-medium text-coral-500">Erro: {formError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 rounded-2xl bg-ink-100 py-2.5 text-sm font-semibold text-ink-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className={`w-full rounded-2xl border-2 border-dashed py-3 text-sm font-bold ${tones.dash}`}
          >
            + Adicionar
          </button>
        )}
      </div>
    </div>
  );
}
