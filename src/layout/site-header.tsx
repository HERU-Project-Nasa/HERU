"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type KeyboardEvent, useRef, useState } from "react";
import { HeruLogo } from "@/brand/heru-logo";
<<<<<<< HEAD
import {
  anomaliesHref,
  useCalendarSelection,
} from "@/calendar-selection/calendar-selection";
=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
import { buttonClassName } from "@/button/button-class-name";
import { MaterialSymbol } from "@/icons/material-symbols";
import { BackgroundMusic } from "@/sound/background-music";
import { DataStatus } from "./data-status";

const NAVIGATION = [
<<<<<<< HEAD
  { path: "/calendar", label: "Calendário" },
  { path: "/anomalies", label: "Anomalias" },
  { path: "/methodology", label: "Metodologia" },
=======
  { href: "/calendar", label: "Calendário" },
  { href: "/anomalies", label: "Anomalias" },
  { href: "/methodology", label: "Metodologia" },
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
];

const NAVIGATION_LINK_CLASS_NAME =
  "type-nav text-ink decoration-2 underline-offset-8 hover:underline aria-[current=page]:underline";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
<<<<<<< HEAD
  const selection = useCalendarSelection();
  const linkTo = (path: string) => {
    if (!selection.area) {
      return path;
    }
    if (path === "/anomalies") {
      return anomaliesHref(selection);
    }
    const params = new URLSearchParams({ area: selection.area });
    if (path === "/calendar" && selection.year) {
      params.set("year", String(selection.year));
    }
    return `${path}?${params}`;
  };
=======
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
  const currentPage = (href: string) =>
    pathname.startsWith(href) ? "page" : undefined;

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape" && menuOpen) {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  };

  return (
    <header className="relative z-20" onKeyDown={closeOnEscape}>
      <div className="flex h-16 items-center justify-between pr-4 pl-6 lg:grid lg:h-20 lg:grid-cols-3 lg:px-16">
        <Link
          href="/"
          aria-label="HERU, página inicial"
          className="inline-flex min-h-11 items-center justify-self-start"
        >
          <HeruLogo variant="header" />
        </Link>
        <nav
          aria-label="Principal"
          className="hidden justify-center gap-14 lg:flex"
        >
          {NAVIGATION.map((item) => (
            <Link
<<<<<<< HEAD
              key={item.path}
              href={linkTo(item.path)}
              aria-current={currentPage(item.path)}
=======
              key={item.href}
              href={item.href}
              aria-current={currentPage(item.href)}
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
              className={`${NAVIGATION_LINK_CLASS_NAME} py-2.5`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 justify-self-end">
          <div className="mr-1 flex lg:mr-2">
            <DataStatus />
          </div>
          <BackgroundMusic />
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`${buttonClassName({ variant: "ghost", size: "icon" })} lg:hidden`}
          >
            {menuOpen ? (
              <MaterialSymbol name="close" className="size-5" />
            ) : (
              <MaterialSymbol name="menu" className="size-5" />
            )}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav
          id="site-menu"
          aria-label="Principal"
          className="absolute inset-x-0 top-full flex flex-col border-y border-line bg-surface px-6 py-2 lg:hidden"
        >
          {NAVIGATION.map((item) => (
            <Link
<<<<<<< HEAD
              key={item.path}
              href={linkTo(item.path)}
              aria-current={currentPage(item.path)}
=======
              key={item.href}
              href={item.href}
              aria-current={currentPage(item.href)}
>>>>>>> 83fef8f61d6288c5b84ef231aa5b5245e2564acd
              onClick={() => setMenuOpen(false)}
              className={`${NAVIGATION_LINK_CLASS_NAME} flex min-h-11 items-center`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
