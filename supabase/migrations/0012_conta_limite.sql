-- Grana+ | limite da conta (cheque especial)
--
-- Opcional por conta. Não entra no saldo nem no patrimônio: serve pra
-- mostrar quanto ainda dá pra usar (saldo + limite) e avisar quando a
-- conta já está usando o limite (saldo negativo).

alter table public.contas add column if not exists limite numeric(14,2) check (limite is null or limite >= 0);
