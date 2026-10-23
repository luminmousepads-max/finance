/** Loans — EMI, amortization, prepayment effect, rate/tenure comparison. */

import { useState } from "react";
import { useStore } from "../../state/StoreContext";
import { compareLoans, LOAN_KIND_NOTES } from "../../engine/loans";
import { formatINR, formatPercent } from "../../lib/format";
import { CategoryBars, SplitBar } from "../charts";
import { Assumption, Callout, Field, LedgerRow, Section, Segmented, Tag } from "../ledger";

export function Loans() {
  const { state, set, derived } = useStore();
  const [showSchedule, setShowSchedule] = useState(false);
  const am = derived.amortization;
  const pre = derived.prepayment;

  const comparison = compareLoans(
    state.loanPrincipal,
    [Math.max(0, state.loanAnnualRate - 0.02), state.loanAnnualRate, state.loanAnnualRate + 0.02],
    [Math.max(1, state.loanYears - 5), state.loanYears, state.loanYears + 5]
  );

  return (
    <div className="fade-in space-y-10">
      <Section
        index="16"
        title="Loans & EMI"
        subtitle="EMI = P × r × (1 + r)^n / ((1 + r)^n − 1). Zero-interest loans are handled as P ÷ n — never a division by zero."
        aside={<Tag kind="fact">{state.loanKind} loan</Tag>}
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <div className="sheet grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Loan amount" value={state.loanPrincipal} onChange={(v) => set("loanPrincipal", v)} prefix="₹" />
              <Field label="Interest rate" value={state.loanAnnualRate * 100} onChange={(v) => set("loanAnnualRate", v / 100)} suffix="% p.a." />
              <Field label="Tenure" value={state.loanYears} onChange={(v) => set("loanYears", v)} suffix="years" min={1} max={40} step="1" />
              <div className="flex items-end">
                <Segmented
                  label="Loan type"
                  value={state.loanKind}
                  onChange={(v) => set("loanKind", v)}
                  options={[
                    { value: "home", label: "Home" },
                    { value: "personal", label: "Personal" },
                    { value: "vehicle", label: "Vehicle" },
                    { value: "education", label: "Education" },
                  ]}
                />
              </div>
            </div>

            <div className="sheet px-5 py-4">
              <h3 className="statement-h text-[16px]">Principal vs interest</h3>
              <div className="mt-3">
                <SplitBar principal={Math.max(0, state.loanPrincipal)} interest={am.totalInterest} />
              </div>
              <div className="mt-4">
                <LedgerRow label="Monthly EMI" value={formatINR(am.emi)} emphasize />
                <LedgerRow label="Total repayment" value={formatINR(am.totalRepayment)} />
                <LedgerRow label="Total interest" value={formatINR(am.totalInterest)} tone="debit" />
                <LedgerRow
                  label="Interest share of repayment"
                  value={formatPercent(am.totalInterest / (am.totalRepayment || 1) * 100)}
                  tone="debit"
                />
              </div>
            </div>

            <div className="sheet px-4 py-4">
              <h3 className="statement-h text-[16px]">Balance and interest by year</h3>
              <CategoryBars
                data={am.yearly.map((y) => ({
                  label: `Y${y.year}`,
                  value: y.interest,
                  color: "#A63328",
                }))}
              />
              <div className="mt-2 flex flex-wrap gap-x-6 text-[11.5px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 bg-debit" /> Interest paid per year
                </span>
                <span>Year-end balance: {formatINR(am.yearly.at(-1)?.balance ?? 0)}</span>
              </div>
            </div>

            <div className="sheet px-4 py-3">
              <button className="btn-secondary" onClick={() => setShowSchedule(!showSchedule)}>
                {showSchedule ? "Hide" : "Show"} amortization schedule ({am.schedule.length} months)
              </button>
              {showSchedule && (
                <div className="mt-3 max-h-[380px] overflow-y-auto">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-sheet">
                      <tr className="border-b border-ink/20 text-left">
                        <th className="py-2 pr-2 font-medium text-muted">#</th>
                        <th className="py-2 pr-2 text-right font-medium text-muted">Opening</th>
                        <th className="py-2 pr-2 text-right font-medium text-muted">EMI</th>
                        <th className="py-2 pr-2 text-right font-medium text-muted">Interest</th>
                        <th className="py-2 pr-2 text-right font-medium text-muted">Principal</th>
                        <th className="py-2 text-right font-medium text-muted">Closing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {am.schedule.map((r) => (
                        <tr key={r.month} className="border-b border-rule">
                          <td className="py-1.5 pr-2 font-mono text-muted">{r.month}</td>
                          <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatINR(r.opening)}</td>
                          <td className="py-1.5 pr-2 text-right font-mono tabular-nums">{formatINR(r.emi)}</td>
                          <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-debit">{formatINR(r.interest)}</td>
                          <td className="py-1.5 pr-2 text-right font-mono tabular-nums text-ledger">{formatINR(r.principal)}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums">{formatINR(r.closing)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="sheet px-5 py-4">
              <h3 className="statement-h text-[16px]">Extra repayment</h3>
              <div className="mt-3 grid gap-4">
                <Field label="One-time extra payment" value={state.prepayAmount} onChange={(v) => set("prepayAmount", v)} prefix="₹" />
                <Field label="After month" value={state.prepayAfterMonth} onChange={(v) => set("prepayAfterMonth", v)} min={1} max={state.loanYears * 12} step="1" suffix={`of ${state.loanYears * 12}`} />
                <Segmented
                  label="Apply as"
                  value={state.prepayStrategy}
                  onChange={(v) => set("prepayStrategy", v)}
                  options={[
                    { value: "tenure", label: "Shorten tenure" },
                    { value: "emi", label: "Reduce EMI" },
                  ]}
                />
              </div>
              <div className="mt-4">
                <LedgerRow label="Interest saved" value={formatINR(pre.interestSaved)} tone="green" />
                <LedgerRow
                  label={state.prepayStrategy === "tenure" ? "Months saved" : "New EMI"}
                  value={state.prepayStrategy === "tenure" ? `${pre.monthsSaved}` : formatINR(pre.newEmi)}
                  emphasize
                />
                <LedgerRow label="Remaining months" value={`${pre.remainingMonths}`} tone="muted" />
              </div>
              <div className="mt-3">
                <Assumption>
                  Recalculated from the prepayment month on the reduced balance at the same rate. Foreclosure charges, wherever applicable, are not modelled.
                </Assumption>
              </div>
            </div>

            <div className="sheet px-5 py-4">
              <h3 className="statement-h text-[16px]">Compare rates & tenures</h3>
              <div className="mt-3">
                <CategoryBars
                  data={comparison.map((c) => ({
                    label: `${(c.rate * 100).toFixed(1)}% · ${c.years}y`,
                    value: c.emi,
                    color: c.rate === state.loanAnnualRate && c.years === state.loanYears ? "#2F5D50" : "#8C8A80",
                  }))}
                />
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[300px] text-[12px]">
                  <thead>
                    <tr className="border-b border-ink/20 text-left">
                      <th className="py-2 font-medium text-muted">Rate · tenure</th>
                      <th className="py-2 text-right font-medium text-muted">EMI</th>
                      <th className="py-2 text-right font-medium text-muted">Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((c, i) => (
                      <tr key={i} className="border-b border-rule">
                        <td className="py-1.5">{(c.rate * 100).toFixed(1)}% · {c.years}y</td>
                        <td className="py-1.5 text-right font-mono tabular-nums">{formatINR(c.emi)}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums text-debit">{formatINR(c.totalInterest)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Callout tone="note">{LOAN_KIND_NOTES[state.loanKind]}</Callout>
          </div>
        </div>
      </Section>
    </div>
  );
}
