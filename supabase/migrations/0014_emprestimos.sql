-- Grana+ | empréstimos
--
-- Mesmo modelo do consórcio: cada empréstimo vira uma despesa parcelada
-- comum (items com emprestimo_id), então as parcelas entram sozinhas no
-- Fluxo, na projeção, no Semestre e nos indicadores. Esta tabela guarda
-- o que é próprio do empréstimo: valor recebido, taxa e, se for o caso,
-- a cota de consórcio em que o dinheiro foi usado (lance).
--
-- Saldo devedor = parcelas ainda não pagas da despesa ligada; entra como
-- dívida no patrimônio.

create table if not exists public.emprestimos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  valor numeric(14,2) not null,
  taxa_juros numeric(6,3),
  consorcio_id uuid references public.consorcios(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.emprestimos enable row level security;

create policy "select_own_emprestimos" on public.emprestimos for select using (auth.uid() = user_id);
create policy "insert_own_emprestimos" on public.emprestimos for insert with check (auth.uid() = user_id);
create policy "update_own_emprestimos" on public.emprestimos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete_own_emprestimos" on public.emprestimos for delete using (auth.uid() = user_id);

alter table public.items add column if not exists emprestimo_id uuid references public.emprestimos(id) on delete cascade;
create index if not exists items_emprestimo_idx on public.items (emprestimo_id);
