/** Budget — categories, surplus, needs/wants/savings with 50/30/20 reference. */

import { useStore } from "../../state/StoreContext";
import { BUDGET_CATEGORIES } from "../../engine/budget";
import { formatINR, formatPercent } from "../../lib/format";
import { CategoryBars, Donut } from "../charts";
import { Assumption, Callout, Field, LedgerRow, Section, Tag } from "../ledger";

export function Budget() {
  const { state, set, derived } = useStore();
  const b = derived.budget;

  const setCat = (key: keyof typeof state.budget, value: number) =>
    set("budget", { ...state.budget, [key]: value });

  const spendRows = b.categories
    .filter((c) => c.kind !== "savings" && c.amount > 0)
    .map((c) => ({ label: c.label, value: c.amount }));

  return (
    <div className="fade-in space-y-10">
      <Section
        index="09"
        title="Monthly budget"
        subtitle={`Built from your actual post-tax income of ${formatINR(derived.monthlyNetIncome)} per month — annual take-home converted to monthly, with other income net of the tax it causes.`}
        aside={<Tag kind="fact">Savings rate {formatPercent(b.savingsRate)}</Tag>}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="sheet px-5 py-4">
            <h3 className="statement-h text-[16px]">Enter monthly amounts</h3>
            <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {BUDGET_CATEGORIES.map((c) => (
                <Field
                  key={c.key}
                  label={c.label}
                  value={state.budget[c.key] ?? 0}
                  onChange={(v) => setCat(c.key, v)}
                  prefix="₹"
                  suffix="/ mo"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="sheet px-5 py-3">
              <LedgerRow label="Monthly net income" value={formatINR(b.monthlyNetIncome)} />
              <LedgerRow label="Planned expenses" value={formatINR(b.totalExpenses)} tone="debit" />
              <LedgerRow label="Savings & investments" value={formatINR(b.savingsAndInvestments)} tone="green" />
              <LedgerRow
                label="Monthly surplus"
                value={formatINR(b.surplus)}
                emphasize
                tone={b.surplus >= 0 ? "green" : "debit"}
              />
            </div>

            <div className="sheet px-5 py-3">
              <LedgerRow label="Needs" value={formatPercent(b.bucketPct.need)} sublabel={formatINR(b.buckets.need)} />
              <LedgerRow label="Wants" value={formatPercent(b.bucketPct.want)} sublabel={formatINR(b.buckets.want)} />
              <LedgerRow label="Savings" value={formatPercent(b.bucketPct.savings)} sublabel={formatINR(b.buckets.savings)} />
            </div>

            <div className="sheet px-5 py-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">
                  50/30/20 reference
                </span>
                <Tag kind="estimate">Optional</Tag>
              </div>
              <div className="mt-2">
                <LedgerRow label="50% needs" value={formatINR(b.fiftyThirtyTwenty.needs)} />
                <LedgerRow label="30% wants" value={formatINR(b.fiftyThirtyTwenty.wants)} />
                <LedgerRow label="20% savings" value={formatINR(b.fiftyThirtyTwenty.savings)} />
              </div>
              <div className="mt-2">
                <Assumption>
                  A starting point only, never enforced — Arth does not treat any split as a rule.
                </Assumption>
              </div>
            </div>
          </div>
        </div>

        {b.warnings.map((w, i) => (
          <div key={i} className="mt-4">
            <Callout>{w}</Callout>
          </div>
        ))}
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section index="10" title="Spending as share of income">
          <div className="sheet px-4 py-4">
            {spendRows.length > 0 ? (
              <CategoryBars
                data={spendRows.map((r) => ({
                  ...r,
                  color: b.categories.find((c) => c.label === r.label)?.kind === "savings" ? "#2F5D50" : "#A63328",
                }))}
              />
            ) : (
              <p className="py-10 text-center text-[13px] text-muted">
                No expenses entered yet — add categories above.
              </p>
            )}
          </div>
        </Section>

        <Section index="11" title="Income split">
          <div className="sheet px-2 py-2">
            <Donut
              data={b.categories.filter((c) => c.amount > 0).map((c) => ({ label: c.label, value: c.amount }))}
              centerLabel="Allocated"
              centerValue={formatPercent(
                (b.totalExpenses + b.savingsAndInvestments) / (b.monthlyNetIncome || 1) * 100
              )}
            />
          </div>
          <div className="sheet mt-4 px-4 py-2">
            {b.categories
              .filter((c) => c.amount > 0)
              .sort((x, y) => y.amount - x.amount)
              .slice(0, 5)
              .map((c) => (
                <LedgerRow key={c.key} label={c.label} value={`${formatINR(c.amount)} · ${formatPercent(c.pctOfIncome)}`} />
              ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
