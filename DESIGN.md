# Grana+ — sistema visual

Referência de qualidade: Apple Human Interface Guidelines (hierarquia, clareza, alvos de toque, cor com significado). A identidade continua a do Grana+: fonte Sora e as cores do swatch.

Ponto de retorno do visual anterior: tag git `visual-antes-redesign`.

## Cor: papel fixo

| Família | Papel | Onde |
|---|---|---|
| `brand` (verde) | entrada, saldo, ação principal, item feito | botão primário, "Pago/Recebido", card de saldo e receitas |
| `coral` (vermelho) | saída, dívida, perigo | card de despesas, valores negativos, excluir |
| `sun` (amarelo) | pendente, atenção | pílula "Pendente", aviso de mês apertado |
| `grape` (roxo) | cartões de crédito e projeção | card de cartões, semestre, gráfico |
| `sky` (turquesa) | consórcio | card de consórcio |
| `ink` (neutro esverdeado) | todo o resto | textos, superfícies, separadores |

A cor fica no ícone, no ponto ou no número que carrega o significado. Valores e superfícies comuns são neutros.

## Tipografia (Sora, números tabulares globais)

- Título da aba: 30px / bold
- Valor do card de resumo: 34px / bold
- Título de seção: 17px / bold (`.section-title`)
- Corpo e linhas de lista: 15px
- Rótulos e grupos: 13px / medium–semibold (`.group-label`), sem caixa alta
- Legendas: 12px (`.caption`), mínimo absoluto de 11px
- Campos: 16px (evita o zoom automático do Safari)

## Superfícies

- Fundo: `ink-50`. Cards: branco, `rounded-3xl` (20px), `shadow-card`.
- Listas: um card com linhas separadas por `divide-ink-100` (lista agrupada), em vez de um card por linha, quando a linha é só leitura ou ação simples.
- Card de resumo colorido: sempre `SummaryCard` (título · valor · apoio · barra · linhas · total).
- Indicadores: `StatCard` neutro, com a cor só no ícone.

## Controles

- Alvo mínimo de 44px: `.btn-*`, `.icon-btn` (ícone pequeno com área de 44px), `.status-pill`.
- Botões: `.btn-primary` (verde), `.btn-secondary` (neutro), `.btn-danger`, `.btn-add` (tracejado, no fim das listas).
- Campos: `.field` + `.field-label`.
- Troca de visão dentro de uma aba: `Segmented`.
- Foco visível só para teclado (`:focus-visible`, anel verde).
- Excluir sempre pede confirmação e diz o que vai junto.

## Movimento

150–250ms, `ease-out-expo`, só para estado: toque (`active:scale`), barras de progresso e troca de segmento. Respeita `prefers-reduced-motion`.
