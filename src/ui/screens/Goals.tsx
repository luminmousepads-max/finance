/** Goals — required monthly funding per goal, aggregated against surplus. */

import { useStore } from "../../state/StoreContext";
import { GOAL_KIND_LABELS, type GoalKind } from "../../engine/goals";
import { formatINR, formatPercent } from "../../lib/format";
import { Callout, Field, LedgerRow, Section, Tag } from "../ledger";
import { EMPTY_GOAL } from "../../state/AppState";

export function Goals() {
  const { state, set, derived } = useStore();
  const agg = derived.goals;

  const patch = (id: string, up: Partial<(typeof state.goals)[number]>) =>
    set(
      "goals",
      state.goals.map((g) => (g.id === id ? { ...g, ...up } : g))
    );

  return (
    <div className="fade-in space-y-10">
      <Section
        index="19"
        title="Financial goals"
        subtitle="Required monthly contribution = shortfall ÷ annuity factor over the timeline. Current savings are compounded forward first; only the shortfall is funded."
        aside={<Tag kind="fact">{agg.results.length} goal(s)</Tag>}
      >
        <div className="space-y-5">
          {state.goals.map((g) => {
            const res = agg.results.find((r) => r.id === g.id);
            return (
              <div key={g.id} className="sheet px-5 py-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block lg:col-span-2">
                    <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">Goal name</span>
                    <input
                      type="text"
                      className="field-input font-sans"
                      placeholder="e.g. Down payment in Pune"
                      value={g.name}
                      onChange={(e) => patch(g.id, { name: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">Type</span>
                    <select
                      className="mt-1 w-full border-b border-rule bg-transparent py-1.5 text-[14px] text-ink outline-none focus:border-ledger"
                      value={g.kind}
                      onChange={(e) => patch(g.id, { kind: e.target.value as GoalKind })}
                    >
                      {Object.entries(GOAL_KIND_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <div className="flex items-end justify-end">
                    <button
                      className="btn-ghost text-debit"
                      onClick={() => set("goals", state.goals.filter((x) => x.id !== g.id))}
                    >
                      Remove
                    </button>
                  </div>
                  <Field label="Target amount" value={g.targetAmount} onChange={(v) => patch(g.id, { targetAmount: v })} prefix="₹" />
                  <Field label="Timeline" value={g.years} onChange={(v) => patch(g.id, { years: v })} suffix="years" min={0} max={50} step="0.5" />
                  <Field label="Current savings" value={g.currentSavings} onChange={(v) => patch(g.id, { currentSavings: v })} prefix="₹" />
                  <Field label="Expected return" value={g.expectedReturn * 100} onChange={(v) => patch(g.id, { expectedReturn: v / 100 })} suffix="% p.a." />
                </div>

                {res && (
                  <div className="mt-4 border-t border-rule pt-3">
                    <LedgerRow
                      label="Savings compounded to target"
                      value={formatINR(res.savingsFv)}
                      sublabel={`${formatINR(g.currentSavings)} today at ${formatPercent(g.expectedReturn * 100, 0)} for ${g.years} y.`}
                    />
                    <LedgerRow label="Still to fund" value={formatINR(res.shortfall)} tone={res.alreadyFunded ? "green" : "debit"} />
                    <LedgerRow
                      label="Required monthly"
                      value={res.alreadyFunded ? "0 — already funded" : formatINR(res.requiredMonthly)}
                      emphasize
                      tone={res.alreadyFunded ? "green" : "ink"}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {state.goals.length === 0 && (
            <div className="sheet px-5 py-8 text-center text-[13px] text-muted">
              No goals yet — add one to see how much of your surplus it would consume.
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-secondary" onClick={() => set("goals", [...state.goals, EMPTY_GOAL("custom")])}>
            + Add goal
          </button>
          <button
            className="btn-ghost"
            onClick={() =>
              set("goals", [
                ...state.goals,
                { ...EMPTY_GOAL("home"), name: "Buying a home", targetAmount: 2_500_000, years: 8 },
                { ...EMPTY_GOAL("car"), name: "Purchasing a car", targetAmount: 900_000, years: 4 },
                { ...EMPTY_GOAL("emergencyFund"), name: "Emergency fund", targetAmount: 300_000, years: 2, expectedReturn: 0.07 },
              ])
            }
          >
            Add common goals
          </button>
        </div>
      </Section>

      <Section
        index="20"
        title="All goals vs surplus"
        subtitle={`Your estimated monthly surplus is ${formatINR(agg.availableSurplus)}. This is what every goal must fit inside.`}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="sheet px-5 py-4">
            {agg.results.length > 0 ? (
              agg.results.map((r) => (
                <LedgerRow
                  key={r.id}
                  label={r.name || GOAL_KIND_LABELS[r.kind]}
                  value={r.alreadyFunded ? "Funded" : formatINR(r.requiredMonthly)}
                  tone={r.alreadyFunded ? "green" : "ink"}
                  sublabel={`Target ${formatINR(r.targetAmount)} in ${r.years} y`}
                />
              ))
            ) : (
              <p className="py-6 text-center text-[13px] text-muted">Nothing to aggregate yet.</p>
            )}
          </div>

          <div className="sheet px-5 py-4">
            <LedgerRow label="Available surplus" value={formatINR(agg.availableSurplus)} />
            <LedgerRow
              label="Required across goals"
              value={formatINR(agg.totalRequiredMonthly)}
              emphasize
              tone={agg.remainingSurplus >= 0 ? "green" : "debit"}
            />
            <LedgerRow label="Remaining after goals" value={formatINR(agg.remainingSurplus)} tone={agg.remainingSurplus >= 0 ? "green" : "debit"} />
            <LedgerRow label="Surplus utilisation" value={formatPercent(agg.utilisationPct, 0)} />
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {agg.warnings.map((w, i) => (
            <Callout key={i}>{w}</Callout>
          ))}
        </div>
      </Section>
    </div>
  );
}
