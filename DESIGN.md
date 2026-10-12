# Grana+ — sistema visual (estilo iOS)

Direção escolhida pelo usuário: o app deve **parecer um app da Apple**. Referência: Apple Human Interface Guidelines. Fonte do sistema, cores do sistema iOS, ícones no estilo SF Symbols.

Ponto de retorno do visual anterior: tag git `visual-antes-redesign`.

## Fonte

Fonte do sistema (`-apple-system` …): SF Pro no iPhone/Mac, Segoe UI no Windows, Roboto no Android. Números tabulares globais.

- Título da aba (large title): 34px / bold
- Valor do card de resumo: 34px / bold
- Título de seção: 20px / bold (`.section-title`)
- Corpo e linhas: 15–17px
- Cabeçalho de grupo de lista: 13px, caixa alta, cinza (`.group-label`), como nas listas agrupadas do iOS
- Legendas: 13px cinza (`.caption`)
- Campos: 16px (sem zoom automático do Safari)
- Rótulo da barra de abas: 10px (padrão do iOS)

## Cor (sistema iOS, modo claro)

| Token | Cor | Papel |
|---|---|---|
| `accent` | systemBlue #007AFF | tudo que é interativo: botões, links, setas, aba ativa |
| `brand` | systemGreen #34C759 (texto #1F7A36) | positivo, entrada, "Pago/Recebido" |
| `coral` | systemRed #FF3B30 (texto #D70015) | saída, dívida, excluir |
| `sun` | systemOrange #FF9500 (texto #B25000) | pendente, atenção |
| `grape` | systemPurple #AF52DE (texto #8944AB) | cartões, projeção |
| `sky` | systemTeal #30B0C7 (texto #0071A4) | consórcio, informativo |
| `ink` | cinzas do sistema | fundo agrupado #F2F2F7, rótulos, separadores |

Cada família tem um tom de preenchimento (o system color) e um tom de texto mais escuro que passa em contraste AA.

## Superfícies

- Fundo cinza agrupado (`ink-50`), cards e listas brancos, planos (sem sombra), `rounded-3xl`.
- Card de resumo (`SummaryCard`): cor sólida, sem degradê.
- Ícones de linha e de indicador: quadrado colorido sólido com desenho branco (`.app-icon`), como no app Ajustes.

## Controles

- Botões em cápsula (`.btn-primary` azul, `.btn-secondary` cinza com texto azul, `.btn-danger`), alvo mínimo de 44px.
- `.btn-add`: botão branco com texto azul no fim das listas.
- Controle segmentado (`Segmented`): trilho cinza, segmento branco elevado.
- Barra de abas translúcida, ícone preenchido e azul na aba atual.
- Ícones: Phosphor (equivalente livre aos SF Symbols), via `components/ui/icons.tsx`.
- Excluir sempre pede confirmação.

## Movimento

150–250ms, só para estado (toque com leve redução de opacidade/escala, barras de progresso, troca de segmento). Respeita `prefers-reduced-motion`.
