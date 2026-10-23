/** Taxes — slab ledger, regime comparison, and per-FY provenance. */

import { useState } from "react";
import { useStore } from "../../state/StoreContext";
import { formatINR, formatPercent } from "../../lib/format";
import { CategoryBars } from "../charts";
import { Assumption, Callout, LedgerRow, Section, Tag } from "../ledger";
import { getTaxYearConfig } from "../../engine/tax/tax-engine";

export function Taxes() {
  const { state, derived } = useStore();
  const [regimeView, setRegimeView] = useState<"new" | "old">(state.regime);
  const res = regimeView === "new" ? derived.bothRegimes[0] : derived.bothRegimes[1];
  const cfg = getTaxYearConfig(state.fy);

  const slabRows = res.slabRows
    .filter((r) => r.incomeInSlab > 0 || r.rate === 0)
    .map((r) => ({
      label: `${short(r.from)}–${r.to === null ? "above" : short(r.to)}`,
      value: r.tax,
      rate: r.rate,
    }));

  const [newTax, oldTax] = derived.bothRegimes;
  const better = newTax.totalTax === oldTax.totalTax ? null : newTax.totalTax < oldTax.totalTax ? "new" : "old";
  const diff = Math.abs(newTax.totalTax - oldTax.totalTax);

  return (
    <div className="fade-in space-y-10">
      <Section
        index="04"
        title="Income tax"
        subtitle={`Computed for ${state.fy} (${cfg.ay}) using the ${regimeView === "new" ? "new" : "old"} regime. Every line below is a step of the calculation, not a summary.`}
        aside={
          <div className="segmented" role="group">
            {(["new", "old"] as const).map((r) => (
              <button key={r} type="button" aria-pressed={regimeView === r} onClick={() => setRegimeView(r)}>
                {r === "new" ? "New regime" : "Old regime"}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="sheet px-5 py-3">
            <LedgerRow label="Taxable income" value={formatINR(res.taxableIncomeRounded)} />
            <LedgerRow label="Slab tax" value={formatINR(res.slabTax)} />
            <LedgerRow
              label="Sec 87A rebate"
              value={formatINR(res.rebate87A)}
              tone={res.rebate87A > 0 ? "green" : "muted"}
            />
            <LedgerRow
              label="Rebate marginal relief"
              value={formatINR(res.rebateMarginalRelief)}
              tone={res.rebateMarginalRelief > 0 ? "green" : "muted"}
            />
            <LedgerRow
              label="Surcharge"
              sublabel={res.surchargeRate > 0 ? `Rate ${formatPercent(res.surchargeRate * 100, 0)}` : undefined}
              value={formatINR(res.surcharge)}
              tone={res.surcharge > 0 ? "debit" : "muted"}
            />
            <LedgerRow
              label="Health & Education cess (4%)"
              value={formatINR(res.cess)}
              tone={res.cess > 0 ? "debit" : "muted"}
            />
            <LedgerRow label="Total tax payable" value={formatINR(res.totalTax)} emphasize tone="debit" />
            <LedgerRow label="Monthly TDS (est.)" value={formatINR(res.totalTax / 12)} tone="muted" />
            <div className="mt-3 flex flex-wrap gap-2 border-t border-ink/15 pt-3">
              <Tag kind="fact">Effective rate {formatPercent(res.effectiveRate)}</Tag>
              <Tag kind="fact">Marginal rate {formatPercent(res.marginalRate, 0)}</Tag>
              <Tag kind="estimate">Rounded to nearest ₹10 (Sec 288B)</Tag>
            </div>
          </div>

          <div className="sheet px-5 py-4">
            <h3 className="statement-h text-[16px]">Tax liability vs payroll deduction</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Your actual liability and what payroll may deduct monthly are different things.
              TDS depends on what your employer knows about exemptions and investments.
            </p>
            <div className="mt-3">
              <LedgerRow label="Annual tax liability" value={formatINR(res.totalTax)} />
              <LedgerRow label="Estimated monthly TDS" value={formatINR(res.totalTax / 12)} />
              <LedgerRow
                label="Tax on other income"
                value={formatINR(derived.taxSplit.taxOnOtherIncome)}
                tone="muted"
              />
            </div>
          </div>
        </div>

        {slabRows.length > 0 && (
          <div className="mt-6 sheet px-4 py-4">
            <h3 className="statement-h text-[16px]">Slab-by-slab</h3>
            <div className="mt-3">
              {res.slabRows
                .filter((r) => r.incomeInSlab > 0)
                .map((r, i) => (
                  <LedgerRow
                    key={i}
                    label={
                      <span className="flex items-baseline gap-2">
                        <span className="font-mono text-[11px] text-debit">
                          {formatPercent(r.rate * 100, 0)}
                        </span>
                        <span>
                          {formatINR(r.from)} – {r.to === null ? "above" : formatINR(r.to)}
                        </span>
                      </span>
                    }
                    value={formatINR(r.tax)}
                    sublabel={`On ${formatINR(r.incomeInSlab)} of income in this slab`}
                  />
                ))}
            </div>
          </div>
        )}
      </Section>

      <Section
        index="05"
        title="New vs old regime"
        subtitle="Both computed on your figures for the selected financial year. Deduction eligibility differs by regime, so each is built independently."
      >
        <div className="sheet overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead>
              <tr className="border-b border-ink/20 text-left">
                <th className="px-4 py-3 font-medium text-muted">Regime</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Taxable income</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Total tax</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Effective rate</th>
                <th className="px-4 py-3 text-right font-medium text-muted">Monthly TDS</th>
              </tr>
            </thead>
            <tbody>
              {[newTax, oldTax].map((r) => (
                <tr
                  key={r.regime}
                  className={`border-b border-rule ${r.regime === better ? "bg-ledger-wash/50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{r.regime === "new" ? "New (default)" : "Old"}</span>
                    {r.regime === better && diff > 0 && (
                      <span className="ml-2">
                        <Tag kind="fact">Lower here</Tag>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatINR(r.taxableIncomeRounded)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatINR(r.totalTax)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatPercent(r.effectiveRate)}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatINR(r.totalTax / 12)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {better === null ? (
            <Callout tone="note">Both regimes produce identical tax on your figures.</Callout>
          ) : (
            <Callout tone="note">
              The {better === "new" ? "new" : "old"} regime is lower by {formatINR(diff)} per year on
              your figures. This is arithmetic on your inputs — your real position may differ with
              exemptions not modelled here.
            </Callout>
          )}
        </div>

        {slabRows.length > 0 && (
          <div className="sheet mt-5 px-4 py-4">
            <h3 className="statement-h text-[16px]">Tax by slab ({regimeView === "new" ? "new" : "old"} regime)</h3>
            <CategoryBars data={slabRows} color={regimeView === "new" ? "#2F5D50" : "#A63328"} />
          </div>
        )}
      </Section>

      <Section
        index="06"
        title="Sources & effective date"
        subtitle="Tax configuration is data, not code. Each financial year records where its rules came from and when they took effect."
      >
        <div className="sheet px-5 py-4">
          <LedgerRow label="Configured financial year" value={`${cfg.fy} (${cfg.ay})`} />
          <LedgerRow label="Effective from" value={cfg.effectiveFrom} />
          <div className="mt-3 border-t border-ink/15 pt-3">
            {cfg.sources.map((s, i) => (
              <LedgerRow
                key={i}
                label={<a className="text-ledger underline underline-offset-2 hover:text-ledger-deep" href={s.url} target="_blank" rel="noreferrer">{s.name}</a>}
                value={s.effectiveDate}
              />
            ))}
          </div>
          {cfg.notes.map((n, i) => (
            <div key={i} className="mt-3">
              <Assumption>{n}</Assumption>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function short(x: number): string {
  if (x >= 100_000) return `₹${(x / 100_000).toFixed(x % 100_000 === 0 ? 0 : 1)}L`;
  return formatINR(x);
}
