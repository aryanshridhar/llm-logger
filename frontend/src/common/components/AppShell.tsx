import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { cn } from "../utils/cn";

interface Props {
  children: ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TopBar />
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-950/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M5 7h14M5 12h14M5 17h9" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-neutral-100">LLM Logger</span>
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">
            Chat · Inference Telemetry
          </span>
        </div>
      </div>
      <nav className="flex items-center gap-1">
        <TopBarLink to="/">Chat</TopBarLink>
        <TopBarLink to="/dashboard">Dashboard</TopBarLink>
      </nav>
    </header>
  );
}

function TopBarLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        cn(
          "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
          isActive ? "bg-neutral-800 text-neutral-100" : "text-neutral-400 hover:text-neutral-200",
        )
      }
    >
      {children}
    </NavLink>
  );
}
