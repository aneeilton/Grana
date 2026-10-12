import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Cores do sistema iOS. Os valores moram em variáveis CSS (app/globals.css)
        // que mudam no modo escuro -- assim toda classe (bg-ink-50, text-brand-700…)
        // acompanha o tema do aparelho sem precisar de "dark:" em cada tela.
        // Papéis: accent = interação, brand = positivo, coral = saída/dívida,
        // sun = atenção, grape = cartões/projeção, sky = consórcio, ink = cinzas.
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        segment: "rgb(var(--c-segment) / <alpha-value>)",
        track: "rgb(var(--c-track) / <alpha-value>)",
        bar: "rgb(var(--c-bar) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--c-accent) / <alpha-value>)",
          50: "rgb(var(--c-accent-50) / <alpha-value>)",
          100: "rgb(var(--c-accent-100) / <alpha-value>)",
          600: "rgb(var(--c-accent-600) / <alpha-value>)",
          700: "rgb(var(--c-accent-700) / <alpha-value>)",
        },
        brand: {
          50: "rgb(var(--c-brand-50) / <alpha-value>)",
          100: "rgb(var(--c-brand-100) / <alpha-value>)",
          200: "rgb(var(--c-brand-200) / <alpha-value>)",
          300: "rgb(var(--c-brand-300) / <alpha-value>)",
          400: "rgb(var(--c-brand-400) / <alpha-value>)",
          500: "rgb(var(--c-brand-500) / <alpha-value>)",
          600: "rgb(var(--c-brand-600) / <alpha-value>)",
          700: "rgb(var(--c-brand-700) / <alpha-value>)",
          800: "rgb(var(--c-brand-800) / <alpha-value>)",
          900: "rgb(var(--c-brand-900) / <alpha-value>)",
        },
        coral: {
          50: "rgb(var(--c-coral-50) / <alpha-value>)",
          100: "rgb(var(--c-coral-100) / <alpha-value>)",
          400: "rgb(var(--c-coral-400) / <alpha-value>)",
          500: "rgb(var(--c-coral-500) / <alpha-value>)",
          600: "rgb(var(--c-coral-600) / <alpha-value>)",
          900: "rgb(var(--c-coral-900) / <alpha-value>)",
        },
        sun: {
          100: "rgb(var(--c-sun-100) / <alpha-value>)",
          400: "rgb(var(--c-sun-400) / <alpha-value>)",
          500: "rgb(var(--c-sun-500) / <alpha-value>)",
        },
        grape: {
          100: "rgb(var(--c-grape-100) / <alpha-value>)",
          400: "rgb(var(--c-grape-400) / <alpha-value>)",
          500: "rgb(var(--c-grape-500) / <alpha-value>)",
          600: "rgb(var(--c-grape-600) / <alpha-value>)",
          900: "rgb(var(--c-grape-900) / <alpha-value>)",
        },
        sky: {
          100: "rgb(var(--c-sky-100) / <alpha-value>)",
          400: "rgb(var(--c-sky-400) / <alpha-value>)",
          500: "rgb(var(--c-sky-500) / <alpha-value>)",
          600: "rgb(var(--c-sky-600) / <alpha-value>)",
          900: "rgb(var(--c-sky-900) / <alpha-value>)",
        },
        ink: {
          50: "rgb(var(--c-ink-50) / <alpha-value>)",
          100: "rgb(var(--c-ink-100) / <alpha-value>)",
          200: "rgb(var(--c-ink-200) / <alpha-value>)",
          400: "rgb(var(--c-ink-400) / <alpha-value>)",
          500: "rgb(var(--c-ink-500) / <alpha-value>)",
          700: "rgb(var(--c-ink-700) / <alpha-value>)",
          800: "rgb(var(--c-ink-800) / <alpha-value>)",
          900: "rgb(var(--c-ink-900) / <alpha-value>)",
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
        card: "0 0 0 0.5px rgb(var(--c-hairline) / 0.06)",
        hero: "none",
        // barra de abas: só o separador de cima (hairline)
        bar: "0 -0.5px 0 rgb(var(--c-hairline) / 0.18)",
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
