"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, CalendarRange, House, Landmark, LayoutGrid } from "lucide-react";

const TABS = [
  { href: "/", label: "Início", icon: House },
  { href: "/fluxo", label: "Fluxo", icon: ArrowLeftRight },
  { href: "/patrimonio", label: "Patrimônio", icon: Landmark },
  { href: "/semestre", label: "Semestre", icon: CalendarRange },
  { href: "/mais", label: "Mais", icon: LayoutGrid },
];

/**
 * Barra de abas fixa no rodapé: material translúcido sobre o conteúdo
 * (separa controle de conteúdo), rótulo de uma palavra em cada aba e a
 * aba atual marcada por cor + peso + indicador -- não só pela cor.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Seções do app"
      className="safe-bottom sticky bottom-0 z-20 border-t border-ink-200/70 bg-white/85 shadow-bar backdrop-blur-xl backdrop-saturate-150"
    >
      <ul className="flex items-stretch justify-between px-1.5">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="group relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 pb-1.5 pt-2 transition active:scale-95"
              >
                <span
                  aria-hidden
                  className={`absolute top-0 h-[3px] w-6 rounded-full bg-brand-600 transition-opacity duration-200 ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 1.8}
                  className={active ? "text-brand-700" : "text-ink-400 group-hover:text-ink-700"}
                  aria-hidden
                />
                <span
                  className={`truncate text-[11px] ${
                    active ? "font-semibold text-brand-700" : "font-medium text-ink-500"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
