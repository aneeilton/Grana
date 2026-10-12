-- Grana+ | consórcios
--
-- Cada cota de consórcio vira uma despesa parcelada comum (items com
-- consorcio_id), então entra sozinha no Fluxo, na projeção, no Semestre
-- e nos indicadores. Esta tabela guarda o que é próprio do consórcio:
-- carta, taxa, se já foi contemplado e a intenção/registro de lance.
--
-- Saldo devedor = parcelas ainda não pagas da despesa ligada. Quando o
-- consórcio está contemplado (você já tem o bem), esse saldo entra como
-- dívida no patrimônio; antes disso é só compromisso futuro.
--
-- Lance (pago com dinheiro próprio): fica como "intencao" (simulação, não
-- entra na projeção) até ser aceito; aí vira uma despesa pontual no mês
-- do lance e as parcelas seguintes passam pro valor pós-lance.

create table if not exists public.consorcios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  carta numeric(14,2) not null,
  taxa_adm numeric(5,2),
  contemplado boolean not null default false,
  lance_valor numeric(14,2),
  lance_competencia date,
  lance_parcela numeric(14,2),
  lance_status text check (lance_status is null or lance_status in ('intencao', 'aceito')),
  created_at timestamptz not null default now()
);

alter table public.consorcios enable row level security;

create policy "select_own_consorcios" on public.consorcios for select using (auth.uid() = user_id);
create policy "insert_own_consorcios" on public.consorcios for insert with check (auth.uid() = user_id);
create policy "update_own_consorcios" on public.consorcios for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_consorcios" on public.consorcios for delete using (auth.uid() = user_id);

alter table public.items add column if not exists consorcio_id uuid references public.consorcios(id) on delete cascade;
create index if not exists items_consorcio_idx on public.items (consorcio_id);
