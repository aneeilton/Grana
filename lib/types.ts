export type Conta = {
  id: string;
  user_id: string;
  nome: string;
  saldo_corrente: number;
  saldo_aplicado: number;
  created_at: string;
};

export type DividaTipo = "curto" | "longo";

export type Divida = {
  id: string;
  user_id: string;
  nome: string;
  valor: number;
  tipo: DividaTipo;
  created_at: string;
};

export type Bem = {
  id: string;
  user_id: string;
  nome: string;
  valor: number;
  created_at: string;
};

export type ItemTipo = "receita" | "despesa";

export type Item = {
  id: string;
  user_id: string;
  tipo: ItemTipo;
  nome: string;
  dia_vencimento: number | null;
  expectativa: boolean;
  fixo: boolean;
  competencia_unica: string | null;
  cartao: boolean;
  limite: number | null;
  parcelas_total: number | null;
  cartao_id: string | null; // compra feita nesse cartão (soma na fatura dele)
  created_at: string;
};

export type Lancamento = {
  id: string;
  item_id: string;
  user_id: string;
  competencia: string; // YYYY-MM-01
  valor: number;
  pago: boolean;
  created_at: string;
};

export type Config = {
  user_id: string;
  variaveis: number;
  conta_padrao_id: string | null;
};

export type GastoDiario = {
  id: string;
  user_id: string;
  data: string; // YYYY-MM-DD
  categoria: string;
  descricao: string | null;
  valor: number;
  created_at: string;
};
