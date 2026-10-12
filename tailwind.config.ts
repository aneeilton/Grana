import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta "Aurora" -- baseada na paleta de marca fornecida (Indigo,
        // Watermelon, Golden Pollen, Turquoise, Jungle Green). Cada cor
        // mantém o hue exato do swatch original num stop "de identidade"
        // (o mais claro/vívido, usado em ícones, bordas e fundos), e usa um
        // tom mais escuro da MESMA família em stops que carregam texto ou
        // fundo sólido com texto branco em cima -- os tons originais do
        // swatch, sozinhos, não passam em contraste AA para essas funções.
        brand: {
          50: "#F0FAF5",
          100: "#DBF5EA",
          200: "#ABEDD0",
          300: "#6CEAB3",
          400: "#30E898",
          500: "#0EAD69", // Jungle Green (swatch exato)
          600: "#0F8753", // botões/links -- AA c/ texto branco
          700: "#0D7749", // texto sobre fundo claro -- AA
          800: "#0F5738",
          900: "#0C3B27",
        },
        // alerta/despesa: Watermelon
        coral: {
          50: "#FFF1F4",
          100: "#FFE0E7",
          400: "#F07590", // decorativo (bordas, ícones)
          500: "#E91644", // texto/fundo -- AA
          600: "#C9123B", // início de gradiente de despesas
          900: "#5C0A1D", // fim escuro de gradiente
        },
        // pendências: Golden Pollen
        sun: {
          100: "#FFF6D6",
          400: "#FFD23F", // decorativo (swatch exato)
          500: "#917108", // texto -- AA (o amarelo puro não passa em contraste)
        },
        // investimentos: Indigo
        grape: {
          100: "#F3E6FA",
          400: "#C874E7", // decorativo
          500: "#540D6E", // swatch exato -- já tem ótimo contraste como texto
          600: "#8E20B6", // tom médio p/ gráficos (barras, etc.)
          900: "#290836", // fim escuro de gradiente
        },
        // contas/informativo: Turquoise
        sky: {
          100: "#DDF6EF",
          400: "#3BCEAC", // decorativo (swatch exato)
          500: "#1C856C", // texto -- AA (o turquesa puro não passa em contraste)
          600: "#167060", // início de gradiente de consórcio
          900: "#0B3B30", // fim escuro de gradiente
        },
        // neutro com leve tom esverdeado (não é slate azulado padrão)
        ink: {
          50: "#F6F8F7",
          100: "#EBEFED",
          200: "#DCE3E0", // separadores/bordas de campo
          400: "#687773", // legendas -- 4.7:1 sobre branco (o antigo #8B9995 ficava em ~3:1)
          500: "#5F706C",
          700: "#33413E",
          800: "#202B29",
          900: "#121917",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        // 3xl = cards (20px); 2xl = blocos internos (16px); xl = controles (12px)
        "3xl": "1.25rem",
      },
      boxShadow: {
        // superfície: sombra curta + difusa, com deslocamento (não halo)
        card: "0 1px 1px rgba(18, 25, 23, 0.04), 0 6px 18px -10px rgba(18, 25, 23, 0.14)",
        // cards de resumo coloridos: um pouco mais de profundidade
        hero: "0 2px 4px -2px rgba(18, 25, 23, 0.18), 0 14px 30px -14px rgba(18, 25, 23, 0.45)",
        // barra de abas flutuante
        bar: "0 -1px 0 rgba(18, 25, 23, 0.06), 0 -8px 24px -16px rgba(18, 25, 23, 0.25)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
