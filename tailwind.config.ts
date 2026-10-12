import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cores do sistema iOS (modo claro). Cada família tem um tom de
        // preenchimento (o "system color" da Apple, usado em fundos, ícones e
        // barras) e um tom de texto mais escuro que passa em contraste AA
        // sobre branco -- o mesmo par que a Apple usa no modo de alto
        // contraste. Os nomes das famílias continuam os do app (brand =
        // verde/positivo, coral = vermelho, sun = laranja/pendente, grape =
        // roxo, sky = turquesa/consórcio).

        // interação (botões, links, aba ativa, seleção): systemBlue
        accent: {
          DEFAULT: "#007AFF",
          50: "#EEF5FF",
          100: "#DCEBFF",
          600: "#0066D6",
          700: "#0059BA",
        },
        // positivo / entrada / feito: systemGreen
        brand: {
          50: "#EBF9EE",
          100: "#D9F4DF",
          200: "#B3E9C0",
          300: "#7DD991",
          400: "#4CD964",
          500: "#34C759",
          600: "#248A3D", // preenchimento com texto branco (AA)
          700: "#1F7A36", // texto
          800: "#196A2D",
          900: "#124F21",
        },
        // saída / dívida / perigo: systemRed
        coral: {
          50: "#FFF1F0",
          100: "#FFE3E1",
          400: "#FF3B30",
          500: "#D70015", // texto e preenchimento com texto branco (AA)
          600: "#C40012",
          900: "#8A000D",
        },
        // pendente / atenção: systemOrange
        sun: {
          100: "#FFF1DE",
          400: "#FF9500",
          500: "#B25000", // texto (AA)
        },
        // cartões e projeção: systemPurple
        grape: {
          100: "#F5EBFB",
          400: "#AF52DE",
          500: "#8944AB", // texto (AA)
          600: "#8944AB",
          900: "#5E2D77",
        },
        // consórcio / informativo: systemTeal
        sky: {
          100: "#E0F5F8",
          400: "#30B0C7",
          500: "#0071A4", // texto (AA)
          600: "#0071A4",
          900: "#004E72",
        },
        // cinzas do sistema: fundo agrupado, separadores e rótulos
        ink: {
          50: "#F2F2F7", // systemGroupedBackground
          100: "#E9E9EE", // preenchimento de controles / separador claro
          200: "#D1D1D6", // systemGray4 -- bordas de campo
          400: "#6E6E73", // rótulo secundário (4.9:1 sobre branco)
          500: "#5E5E62",
          700: "#3A3A3C",
          800: "#1C1C1E",
          900: "#000000", // label
        },
      },
      fontFamily: {
        // Fonte do sistema: SF Pro no iPhone/Mac, Segoe UI no Windows,
        // Roboto no Android -- o app usa a fonte nativa de cada aparelho.
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          "system-ui",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        // 3xl = cards e listas agrupadas (20px); 2xl = blocos internos
        // (16px); xl = campos (12px); botões são cápsulas (rounded-full)
        "3xl": "1.25rem",
      },
      boxShadow: {
        // superfícies do iOS são planas sobre o fundo cinza agrupado; só um
        // contorno finíssimo pra não sumir em telas muito claras
        card: "0 0 0 0.5px rgba(0, 0, 0, 0.04)",
        hero: "none",
        // barra de abas: só o separador de cima (hairline)
        bar: "0 -0.5px 0 rgba(0, 0, 0, 0.18)",
        // segmento selecionado do controle segmentado
        segment: "0 3px 8px rgba(0, 0, 0, 0.12), 0 3px 1px rgba(0, 0, 0, 0.04)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
