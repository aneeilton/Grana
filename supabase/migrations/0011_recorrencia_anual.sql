-- Grana+ | item anual/sazonal: 3º tipo de recorrência
--
-- Além de fixo (todo mês), parcelado (N meses) e pontual (1 mês), um item
-- pode repetir só em alguns meses do ano (IPVA em jan, IPTU, 13º em dez,
-- material escolar em fev...). meses_recorrencia guarda esses meses
-- (1-12); o valor se repete a cada ano a partir do último lançado.

alter table public.items add column if not exists meses_recorrencia smallint[]
  check (meses_recorrencia is null or meses_recorrencia <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]);
