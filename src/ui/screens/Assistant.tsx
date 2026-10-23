/**
 * Assistant — rule-based explanation of the engine's actual outputs.
 * Reads only computed results; labels facts, estimates, assumptions and
 * cautions; closes with the disclaimer. No numbers are generated here.
 */

import { useMemo, useState } from "react";
import { useStore } from "../../state/StoreContext";
import {
  DISCLAIMER,
  explainBudget,
  explainGoals,
  explainPortfolio,
  explainRetirement,
  explainTakeHome,
} from "../../engine/assistant";
import type { AssistantLine } from "../../engine/assistant";
import { Tag } from "../ledger";

type TopicId = "salary" | "tax" | "budget" | "portfolio" | "retirement" | "goals";

const TOPICS: { id: TopicId; label: string; blurb: string }[] = [
  { id: "salary", label: "My salary", blurb: "How your salary is divided" },
  { id: "tax", label: "My tax", blurb: "How the tax figure was calculated" },
  { id: "budget", label: "My budget", blurb: "Spending and shortfalls" },
  { id: "portfolio", label: "My portfolio", blurb: "Allocation and returns" },
  { id: "retirement", label: "My retirement", blurb: "Corpus, inflation, the gap" },
  { id: "goals", label: "My goals", blurb: "Trade-offs against surplus" },
];

const KIND_META: Record<AssistantLine["kind"], { tag: "fact" | "estimate" | "caution"; label: string }> = {
  fact: { tag: "fact", label: "Calculated" },
  estimate: { tag: "estimate", label: "Estimate" },
  assumption: { tag: "estimate", label: "Assumption" },
  caution: { tag: "caution", label: "Caution" },
  note: { tag: "fact", label: "Note" },
};

export function Assistant() {
  const { state, derived } = useStore();
  const [topic, setTopic] = useState<TopicId>("salary");

  const lines = useMemo<AssistantLine[]>(() => {
    switch (topic) {
      case "salary": {
        const base = explainTakeHome(
          derived.takeHome,
          `${state.salaryLpa} LPA (${state.salaryBasis.toUpperCase()}, ${derived.isEstimateStructure ? "estimated structure" : "from salary slip"})`
        );
        return [
          ...base,
          ...(derived.takeHome.taxableBuild.hraExemption === 0 && state.regime === "new"
            ? [{ kind: "note" as const, text: "Under the new regime your HRA (rent) does not reduce taxable income — switch to the old regime in Taxes to compare with HRA exemption applied." }]
            : []),
        ];
      }
      case "tax": {
        const [newT, oldT] = derived.bothRegimes;
        const lower = newT.totalTax < oldT.totalTax ? "new" : oldT.totalTax < newT.totalTax ? "old" : null;
        return [
          {
            kind: "fact",
            text: `New regime: ${newT.totalTax === 0 ? "nil tax" : "tax " + fmt(newT.totalTax)} on taxable income ${fmt(newT.taxableIncomeRounded)}. Old regime: ${oldT.totalTax === 0 ? "nil tax" : "tax " + fmt(oldT.totalTax)} on ${fmt(oldT.taxableIncomeRounded)}.`,
          },
          ...(lower
            ? [{ kind: "note" as const, text: `The ${lower} regime is lower on your figures by ${fmt(Math.abs(newT.totalTax - oldT.totalTax))} per year. This is arithmetic on your declared inputs only.` }]
            : [{ kind: "note" as const, text: "Both regimes produce the same tax on your current figures." }]),
          ...explainTakeHome(derived.takeHome, "").filter((l) => l.kind === "fact" && (l.text.includes("tax") || l.text.includes("rate"))),
          { kind: "assumption" as const, text: `${state.fy} rules are used, sourced from the Income Tax Department and Budget documents listed in Taxes → Sources. If the rules change, the config file is updated — not the engine.` },
        ];
      }
      case "budget":
        return explainBudget(derived.budget);
      case "portfolio":
        return explainPortfolio(derived.portfolio);
      case "retirement":
        return explainRetirement(derived.retirement);
      case "goals":
        return explainGoals(derived.goals);
    }
  }, [topic, state, derived]);

  const active = TOPICS.find((t) => t.id === topic)!;

  return (
    <div className="fade-in space-y-6">
      <div className="margin-rule pl-4 sm:pl-6">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-widest text-debit">24</span>
          <h2 className="statement-h text-[19px] sm:text-[22px]">Financial assistant</h2>
        </div>
        <p className="mt-1 max-w-[64ch] text-[13px] leading-relaxed text-muted">
          Ask it to explain a part of your ledger. Every sentence is derived from your engine's
          output — the assistant cannot introduce numbers of its own.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex flex-col gap-1 lg:border-r lg:border-rule lg:pr-4">
          {TOPICS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTopic(t.id)}
              aria-pressed={topic === t.id}
              className={`flex items-baseline gap-2.5 rounded-sheet px-3 py-2.5 text-left text-[13px] transition-colors ${
                topic === t.id
                  ? "bg-ink text-paper"
                  : "text-muted hover:bg-rule/50 hover:text-ink"
              }`}
            >
              <span className="font-mono text-[10px] opacity-70">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1">{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="sheet ruled px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="statement-h text-[17px]">{active.blurb}</h3>
            <Tag kind="fact">From engine output</Tag>
          </div>

          <div className="mt-4 space-y-4">
            {lines.map((l, i) => {
              const meta = KIND_META[l.kind];
              return (
                <div key={i} className="border-b border-rule pb-3 last:border-b-0">
                  <div className="mb-1.5">
                    <Tag kind={meta.tag}>{meta.label}</Tag>
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-ink">{l.text}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 border-t border-ink/20 pt-3">
            <p className="text-[11.5px] leading-relaxed text-muted">{DISCLAIMER}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(x: number): string {
  return "₹" + Math.round(x).toLocaleString("en-IN");
}
