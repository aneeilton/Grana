-- Grana+ | compra (parcelada ou à vista) lançada na fatura de um cartão
--
-- Uma despesa pontual/parcelada pode apontar pro cartão em que foi
-- feita. As parcelas dela somam na fatura desse cartão em cada mês do
-- plano, e são marcadas como pagas junto com a fatura. Apagar o cartão
-- apaga as compras ligadas a ele.

alter table public.items add column if not exists cartao_id uuid references public.items(id) on delete cascade;
create index if not exists items_cartao_idx on public.items (cartao_id);
