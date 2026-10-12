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
- Campos: 16px (sem zoom automático do Safari). Parados têm preenchimento cinza leve e sem borda; ao tocar ganham fundo de superfície e anel azul.
- Dinheiro: sempre `MoneyInput` (formato 1.726,00, digitação tipo maquininha pelos centavos; "-" deixa negativo).
- Rótulo da barra de abas: 10px (padrão do iOS)

## Cor (sistema iOS, claro e escuro)

O tema segue o aparelho (`prefers-color-scheme`). As cores moram em variáveis CSS em `app/globals.css` (canais RGB) e o `tailwind.config.ts` aponta pra elas, então toda classe (`bg-ink-50`, `text-brand-700`…) troca sozinha no escuro, sem `dark:` nas telas. No escuro: fundo preto, superfícies `#1C1C1E`, cores do sistema na versão escura e tons de texto mais claros. Nunca use `bg-white` pra card: use `bg-surface`. `text-white` só sobre preenchimento colorido.

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
- Barra de abas translúcida, ícone preenchido e azul na aba atual. Some ao rolar pra baixo e volta ao rolar pra cima.
- Card de resumo compacto (28px no valor, linhas de 14px); listas com mais de 4 itens ficam recolhidas com "Ver todos".
- Ícones: Phosphor (equivalente livre aos SF Symbols), via `components/ui/icons.tsx`.
- Excluir sempre pede confirmação.

## Movimento

150–250ms, só para estado (toque com leve redução de opacidade/escala, barras de progresso, troca de segmento). Respeita `prefers-reduced-motion`.

## Gráficos

- `MonthBars` (`components/ui/MonthBars.tsx`): barras por mês em SVG com as cores do tema. Roxo = normal, laranja = mês apertado, vermelho = saldo negativo. Toque mostra o valor; sem toque, o detalhe mostra o pior mês. Usado na Home e no Semestre.
- Comparações simples (entradas × saídas, composição do patrimônio) são barras horizontais em HTML, sem biblioteca.
- Texto e valores ficam em tinta neutra; a cor fica só na marca.

## Home (ordem)

Saldo → Fluxo do mês (entradas × saídas) → Próximos 6 meses (gráfico + 3 percentuais) → Lançamentos do mês → Gastos do dia a dia → Patrimônio (líquido + composição, reserva e saúde lado a lado; detalhe da nota recolhido).
