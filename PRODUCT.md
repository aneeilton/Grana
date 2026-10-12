# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Uso pessoal: um único usuário (o dono do app) controlando as próprias finanças, quase sempre pelo celular, às vezes pelo computador.

## Product Purpose

Grana+ é o controle financeiro pessoal do dono: saldo real das contas, receitas e despesas mês a mês, cartões de crédito, consórcios, dívidas e bens, com projeção dos próximos meses. Sucesso é saber, em poucos segundos, quanto sobra no mês, qual mês vai apertar e quanto está comprometido — e conseguir lançar/marcar como pago rápido no celular.

## Positioning

Feito sob medida para a rotina financeira do dono (não um app genérico de mercado): fixas, parceladas, anuais/sazonais, compras parceladas na fatura de cada cartão, cotas de consórcio com intenção de lance, e projeção semestral encadeada a partir do saldo real.

## Operating Context

- Abas: Início, Fluxo (Receitas, Despesas, Cartões, Consórcio), Patrimônio (Contas, Dívidas, Bens), Semestre, Mais.
- Fluxo diário: abrir o Início, ver sobra/faturas, marcar lançamentos como pago/recebido (ajusta a conta padrão), atualizar saldo das contas.
- Planejamento: Semestre (grade item × mês, mês mais apertado, simulador "E se…?").
- Dados no Supabase; deploy na Vercel; mudanças feitas também pelo celular.

## Capabilities and Constraints

- Next.js 14 (app router) + Tailwind + Supabase; recharts nos gráficos; ícones lucide-react.
- Interface em português do Brasil, valores em BRL.
- Mobile-first: precisa funcionar bem com uma mão no celular.
- Valores podem ser ocultados (ícone de olho no Início).
- Limite da conta (cheque especial) é só informativo: nunca soma no saldo.

## Brand Commitments

- Nome: Grana+.
- Ponto de retorno do visual anterior ao redesign: tag git `visual-antes-redesign` (commit 6a54ff8). Se a atualização visual não agradar, volta-se a esse ponto.
- Direção visual da atualização: virá de um prompt do próprio usuário (pendente).

## Evidence on Hand

- Dados reais do usuário no Supabase (contas, cartões, consórcios, lançamentos). Não inventar números em telas de exemplo.

## Product Principles

1. Clareza em segundos: o número que importa vem primeiro (sobra, saldo, mês crítico).
2. Consistência entre telas: o mesmo tipo de informação tem a mesma forma em todo lugar (dor atual do usuário: telas inconsistentes).
3. Personalidade própria: não parecer um app financeiro genérico (dor atual do usuário).
4. Lançar rápido: marcar pago, atualizar saldo e lançar valor com poucos toques no celular.
5. Honestidade dos números: projeções e simulações sempre rotuladas como tal.
