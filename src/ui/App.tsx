/**
 * App shell: numbered ledger index rail + page area with the red margin.
 * The rail reads like index tabs on an account book, not an icon nav.
 */

import { useEffect, useState } from "react";
import { useStore } from "../state/StoreContext";
import { Onboarding } from "./Onboarding";
import { Overview } from "./screens/Overview";
import { Taxes } from "./screens/Taxes";
import { Salary } from "./screens/Salary";
import { Budget } from "./screens/Budget";
import { Investments } from "./screens/Investments";
import { Loans } from "./screens/Loans";
import { Retirement } from "./screens/Retirement";
import { Goals } from "./screens/Goals";
import { Settings } from "./screens/Settings";
import { Assistant } from "./screens/Assistant";
import { formatINR, formatLPA } from "../lib/format";

const NAV = [
  { id: "overview", label: "Overview", n: "01" },
  { id: "taxes", label: "Taxes", n: "04" },
  { id: "salary", label: "Salary", n: "07" },
  { id: "budget", label: "Budget", n: "09" },
  { id: "investments", label: "Investments", n: "12" },
  { id: "loans", label: "Loans", n: "16" },
  { id: "retirement", label: "Retirement", n: "17" },
  { id: "goals", label: "Goals", n: "19" },
  { id: "assistant", label: "Assistant", n: "24" },
  { id: "settings", label: "Settings", n: "21" },
] as const;

type NavId = (typeof NAV)[number]["id"];

export function App() {
  const { state, derived } = useStore();
  const [page, setPage] = useState<NavId>("overview");

  // Hash routing so pages are linkable and refresh-safe.
  useEffect(() => {
    const readHash = () => {
      const fromHash = window.location.hash.replace("#", "") as NavId;
      if (NAV.some((n) => n.id === fromHash)) setPage(fromHash);
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, []);

  useEffect(() => {
    if (window.location.hash !== `#${page}`) window.location.hash = page;
  }, [page]);

  if (!state.onboarded) return <Onboarding />;

  const th = derived.takeHome;

  return (
    <div className="min-h-screen">
      {/* Masthead */}
      <header className="sticky top-0 z-20 border-b border-rule bg-paper/95 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-4">
            <a href="#overview" className="flex items-baseline gap-2 no-underline" onClick={() => setPage("overview")}>
              <span className="statement-h text-[24px] leading-none tracking-tight">Arth</span>
              <span className="hidden text-[11.5px] italic text-muted sm:inline">
                Understand your money. Plan your future.
              </span>
            </a>
          </div>
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[11.5px] tabular-nums">
            <span className="text-muted">
              {state.salaryLpa > 0 ? formatLPA(state.salaryLpa) : "—"}
            </span>
            <span className="text-muted">{state.fy}</span>
            <span className="text-muted uppercase">{state.regime} regime</span>
            <span className="text-ledger">
              Take-home/mo {th.monthlyTakeHome > 0 ? formatINR(th.monthlyTakeHome) : "—"}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1360px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[178px_1fr]">
        {/* Index rail — ledger tab dividers */}
        <nav aria-label="Sections" className="min-w-0 lg:sticky lg:top-[68px] lg:self-start">
          <ol className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0">
            {NAV.map((n) => {
              const active = page === n.id;
              return (
                <li key={n.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setPage(n.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-baseline gap-2 border-l-[3px] px-3 py-2 text-left text-[13px] transition-colors ${
                      active
                        ? "border-debit bg-sheet font-semibold text-ink"
                        : "border-transparent text-muted hover:border-rule hover:text-ink"
                    }`}
                  >
                    <span className="font-mono text-[10px] tabular-nums opacity-60">{n.n}</span>
                    <span>{n.label}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 hidden border-t border-rule pt-4 lg:block">
            <div className="px-3 text-[10.5px] uppercase tracking-[0.12em] text-muted">Quick read</div>
            <div className="mt-2 space-y-2 px-3 font-mono text-[12px] tabular-nums">
              <div>
                <div className="text-[10px] text-muted">Surplus / mo</div>
                <div className={derived.summary.monthlySurplus >= 0 ? "text-ledger" : "text-debit"}>
                  {formatINR(derived.summary.monthlySurplus)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted">Tax / yr</div>
                <div className="text-debit">{formatINR(th.incomeTax)}</div>
              </div>
            </div>
          </div>
        </nav>

        {/* Page area */}
        <main className="min-w-0">
          {page === "overview" && <Overview />}
          {page === "taxes" && <Taxes />}
          {page === "salary" && <Salary />}
          {page === "budget" && <Budget />}
          {page === "investments" && <Investments />}
          {page === "loans" && <Loans />}
          {page === "retirement" && <Retirement />}
          {page === "goals" && <Goals />}
          {page === "assistant" && <Assistant />}
          {page === "settings" && <Settings />}

          <footer className="mt-16 border-t border-rule pt-5 pb-10 text-[11.5px] leading-relaxed text-muted">
            <p>
              Arth is a local-only planning tool. Data stays in this browser (key{" "}
              <span className="font-mono">arth:v1</span>) — no accounts, no servers, no bank
              access. Calculations are educational; Arth is not a registered investment or
              financial adviser, and no figure here is a guarantee of returns or tax outcomes.
              Verify against official sources and consult a qualified professional.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
