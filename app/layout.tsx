import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grana+ | Finanças pessoais",
  description: "Controle suas contas, cartões, dívidas e patrimônio em um só lugar.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // barra do navegador acompanha o tema do aparelho
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-ink-50 font-sans">
        <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-ink-50 shadow-2xl sm:my-4 sm:min-h-[calc(100dvh-2rem)] sm:rounded-3xl">
          {children}
        </div>
      </body>
    </html>
  );
}
