/** Retirement — corpus projection, inflation adjustment, required-corpus gap. */

import { useStore } from "../../state/StoreContext";
import { formatINR, formatPercent } from "../../lib/format";
import { DualLine } from "../charts";
import { Assumption, Callout, Field, LedgerRow, Section, Tag } from "../ledger";

export function Retirement() {
  const { state, set, derived } = useStore();
  const r = derived.retirement;

  const chartData = derived.retirementPath.map((p) => ({
    year: p.year,
    age: p.age,
    corpus: p.corpus,
    required: r.requiredCorpus,
  }));

  return (
    <div className="fade-in space-y-10">
      <Section
        index="17"
        title="Retirement planner"
        subtitle={`Horizon: ${r.yearsToRetirement} years (age ${state.age} → ${r.ageAtRetirement}). Projections are arithmetic on your assumptions, not promises of sufficiency.`}
        aside={<Tag kind="estimate">Assumption-driven</Tag>}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <div className="sheet grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Current age" value={state.age} onChange={(v) => set("age", v)} min={18} max={90} step="1" />
              <Field label="Retirement age" value={state.retirementAgeTarget} onChange={(v) => set("retirementAgeTarget", v)} min={40} max={80} step="1" />
              <Field label="Retirement duration" value={state.retirementDurationYears} onChange={(v) => set("retirementDurationYears", v)} suffix="years" min={1} max={50} step="1" hint="Years the corpus must last." />
              <Field label="Current retirement investments" value={state.retirementCurrentCorpus} onChange={(v) => set("retirementCurrentCorpus", v)} prefix="₹" />
              <Field label="Monthly contribution" value={state.retirementMonthly} onChange={(v) => set("retirementMonthly", v)} prefix="₹" />
              <Field label="Expected return (accumulation)" value={state.retirementReturn * 100} onChange={(v) => set("retirementReturn", v / 100)} suffix="% p.a." />
              <Field label="Expected return (drawing)" value={state.retirementPostReturn * 100} onChange={(v) => set("retirementPostReturn", v / 100)} suffix="% p.a." />
              <Field label="Expected inflation" value={state.inflationRate * 100} onChange={(v) => set("inflationRate", v / 100)} suffix="% p.a." />
              <Field label="Retirement spending (today's ₹/yr)" value={state.retirementSpendingToday} onChange={(v) => set("retirementSpendingToday", v)} prefix="₹" />
            </div>

            <div className="sheet px-4 py-4">
              <h3 className="statement-h text-[16px]">Corpus path vs required corpus</h3>
              <DualLine
                data={chartData}
                xKey="age"
                a={{ key: "corpus", name: "Projected corpus", color: "#2F5D50" }}
                b={{ key: "required", name: "Required at retirement", color: "#A63328" }}
                xLabel="Age"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="sheet px-5 py-3">
              <LedgerRow label="Years to retirement" value={`${r.yearsToRetirement}`} />
              <LedgerRow
                label="Projected corpus"
                value={formatINR(r.projectedCorpus)}
                emphasize
              />
              <LedgerRow
                label="In today's rupees"
                value={formatINR(r.projectedCorpusReal)}
                tone="green"
                sublabel={`Deflated at ${formatPercent(state.inflationRate * 100, 0)} for ${r.yearsToRetirement} years.`}
              />
              <LedgerRow label="· from current corpus" value={formatINR(r.corpusFromExisting)} tone="muted" />
              <LedgerRow label="· from contributions" value={formatINR(r.corpusFromContributions)} tone="muted" />
            </div>

            <div className="sheet px-5 py-3">
              <LedgerRow
                label="Spending at retirement"
                value={formatINR(r.futureAnnualSpending)}
                sublabel={`${formatINR(r.monthlySpendingAtRetirement)} / month in future rupees.`}
              />
              <LedgerRow label="Required corpus" value={formatINR(r.requiredCorpus)} emphasize />
              <LedgerRow
                label="Gap"
                value={formatINR(r.gap)}
                tone={r.gap > 0 ? "debit" : "green"}
                sublabel={r.gap > 0 ? "Projected corpus falls short under these assumptions." : "Projection exceeds the required corpus under these assumptions."}
              />
              <LedgerRow label="Corpus years" value={`${r.corpusYears.toFixed(1)}`} tone="muted" />
              <LedgerRow
                label="First-year withdrawal rate"
                value={formatPercent(r.firstYearWithdrawalRate)}
                tone="muted"
              />
            </div>

            <div className="sheet px-5 py-3">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">Assumptions</span>
              <div className="mt-2 space-y-2">
                {r.assumptions.map((a, i) => (
                  <Assumption key={i}>{a}</Assumption>
                ))}
              </div>
            </div>
          </div>
        </div>

        {r.warnings.map((w, i) => (
          <div key={i} className="mt-4">
            <Callout>{w}</Callout>
          </div>
        ))}

        <div className="mt-4">
          <Callout tone="note">
            Arth will not tell you a projected corpus is sufficient. Lower returns, higher
            inflation, healthcare costs, or a longer life than planned can all change the outcome.
            Treat these as scenario tools and consult a qualified financial planner for decisions.
          </Callout>
        </div>
      </Section>

      <Section
        index="18"
        title="Emergency fund & insurance"
        subtitle="Emergency target = essential monthly expenses × months you choose. The months figure is yours to set; Arth never picks one for you."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="sheet px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Essential monthly expenses"
                value={state.essentialMonthlyExpenses}
                onChange={(v) => set("essentialMonthlyExpenses", v)}
                prefix="₹"
                hint="Leave 0 to fall back to your full monthly expenses."
              />
              <Field
                label="Current emergency savings"
                value={state.emergencySavings}
                onChange={(v) => set("emergencySavings", v)}
                prefix="₹"
              />
            </div>
            <div className="mt-4">
              <LedgerRow label="Target (6 months)" value={formatINR(derived.emergency.target)} emphasize />
              <LedgerRow label="Current" value={formatINR(derived.emergency.current)} />
              <LedgerRow label="Remaining" value={formatINR(derived.emergency.remaining)} tone="debit" />
              <LedgerRow
                label="Months covered today"
                value={`${derived.emergency.monthsCovered.toFixed(1)}`}
                tone="green"
              />
            </div>
            <div className="mt-3">
              <Assumption>
                6 months is the default display target. Adjust for employment stability,
                dependents and your circumstances — a shorter or longer target is a legitimate choice.
              </Assumption>
            </div>
            {derived.emergency.warnings.map((w, i) => (
              <div key={i} className="mt-3">
                <Callout>{w}</Callout>
              </div>
            ))}
          </div>

          <div className="sheet px-5 py-4">
            <h3 className="statement-h text-[16px]">Insurance coverage review</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Enter what you know. Arth flags gaps as review items — it does not invent an exact
              cover requirement, because that needs context this screen does not collect.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Health cover (sum insured)" value={state.insuranceHealthCover} onChange={(v) => set("insuranceHealthCover", v)} prefix="₹" />
              <Field label="Health premium" value={state.insuranceHealthPremium} onChange={(v) => set("insuranceHealthPremium", v)} prefix="₹" suffix="/ yr" />
              <Field label="Term life cover" value={state.insuranceTermCover} onChange={(v) => set("insuranceTermCover", v)} prefix="₹" />
              <Field label="Term premium" value={state.insuranceTermPremium} onChange={(v) => set("insuranceTermPremium", v)} prefix="₹" suffix="/ yr" />
              <Field label="Outstanding loans" value={state.insuranceOutstandingLoans} onChange={(v) => set("insuranceOutstandingLoans", v)} prefix="₹" />
              <Field label="Family living expense (annual)" value={state.insuranceFamilyExpense} onChange={(v) => set("insuranceFamilyExpense", v)} prefix="₹" />
              <Field label="Income earners in family" value={state.insuranceEarners} onChange={(v) => set("insuranceEarners", v)} min={1} max={10} step="1" />
            </div>
            <div className="mt-4">
              <LedgerRow label="Total annual premium" value={formatINR(derived.insurance.totalAnnualPremium)} />
              <LedgerRow label="Loan-cover reference" value={formatINR(derived.insurance.loanCoverReference)} tone="muted" sublabel="Declared outstanding loans — one reference basis, not a requirement." />
              <LedgerRow label="Expense-cover reference" value={formatINR(derived.insurance.familyExpenseCoverReference)} tone="muted" sublabel="Declared annual family expenses." />
            </div>
            {derived.insurance.gaps.map((g, i) => (
              <div key={i} className="mt-3">
                <Callout>{g}</Callout>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
}
