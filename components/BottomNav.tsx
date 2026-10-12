"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, CalendarRange, House, Landmark, LayoutGrid } from "@/components/ui/icons";

const TABS = [
  { href: "/", label: "Início", icon: House },
  { href: "/fluxo", label: "Fluxo", icon: ArrowLeftRight },
  { href: "/patrimonio", label: "Patrimônio", icon: Landmark },
  { href: "/semestre", label: "Semestre", icon: CalendarRange },
  { href: "/mais", label: "Mais", icon: LayoutGrid },
];

/**
 * Barra de abas no padrão do iOS: material translúcido sobre o conteúdo,
 * ícone preenchido + tinta azul na aba atual, contorno cinza nas demais.
 * Some ao rolar pra baixo (mais tela pro conteúdo) e volta ao rolar pra
 * cima ou ao chegar no topo.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [oculta, setOculta] = useState(false);
  const ultimoY = useRef(0);

  useEffect(() => {
    ultimoY.current = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      const delta = y - ultimoY.current;
      if (y < 60) setOculta(false);
      else if (delta > 8) setOculta(true);
      else if (delta < -8) setOculta(false);
      // pequenos tremores do dedo não contam
      if (Math.abs(delta) > 8 || y < 60) ultimoY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // trocou de aba: barra sempre visível
  useEffect(() => setOculta(false), [pathname]);

  return (
    <nav
      aria-label="Seções do app"
      className={`safe-bottom sticky bottom-0 z-20 bg-bar/80 shadow-bar backdrop-blur-xl backdrop-saturate-[1.8] transition-transform duration-300 ease-out-expo ${
        oculta ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <ul className="flex items-stretch justify-between px-1">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 pb-1 pt-1.5 transition active:opacity-60 ${
                  active ? "text-accent" : "text-ink-400"
                }`}
              >
                <Icon size={26} weight={active ? "fill" : "regular"} aria-hidden />
                <span className="truncate text-[10px] font-medium leading-none tracking-[0.01em]">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
