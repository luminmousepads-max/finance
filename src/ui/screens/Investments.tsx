/** Investments — SIP, step-up SIP, lump sum, scenarios, portfolio tracker. */

import { useState } from "react";
import { useStore } from "../../state/StoreContext";
import { ASSET_CATEGORY_LABELS, type AssetCategory } from "../../engine/portfolio";
import { formatINR, formatPercent, shortINR } from "../../lib/format";
import { Donut, GrowthArea } from "../charts";
import { Assumption, Callout, Field, LedgerRow, Section, Segmented, Tag } from "../ledger";
import { EMPTY_ASSET } from "../../state/AppState";

export function Investments() {
  const { state, set, derived } = useStore();
  const [tab, setTab] = useState<"calculators" | "portfolio">("calculators");

  const scenarios = [0.08, 0.12, 0.15].map((rate) => ({
    label: `${(rate * 100).toFixed(0)}% ${rate === 0.08 ? "(conservative)" : rate === 0.12 ? "(moderate)" : "(optimistic)"}`,
    rate,
    value: derived.sip.futureValue * 0 + // recalc per rate below
      0,
  }));

  return (
    <div className="fade-in space-y-8">
      <div className="margin-rule pl-4 sm:pl-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[11px] font-semibold tracking-widest text-debit">12</span>
            <h2 className="statement-h text-[19px] sm:text-[22px]">Investments</h2>
          </div>
          <div className="segmented">
            <button type="button" aria-pressed={tab === "calculators"} onClick={() => setTab("calculators")}>
              Calculators
            </button>
            <button type="button" aria-pressed={tab === "portfolio"} onClick={() => setTab("portfolio")}>
              Portfolio tracker
            </button>
          </div>
        </div>
      </div>

      {tab === "calculators" ? (
        <div className="fade-in space-y-10">
          <Section index="12" title="SIP calculator" subtitle="Ordinary annuity — monthly contributions at the end of each month. FV = P × (((1 + r)^n − 1) / r).">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="sheet px-4 py-4">
                <GrowthArea data={derived.sipProjection} xLabel="Year" />
              </div>
              <div className="space-y-4">
                <div className="sheet grid gap-4 px-5 py-4 sm:grid-cols-2">
                  <Field label="Monthly investment" value={state.sipMonthly} onChange={(v) => set("sipMonthly", v)} prefix="₹" />
                  <Field label="Duration" value={state.sipYears} onChange={(v) => set("sipYears", v)} suffix="years" min={1} max={50} step="1" />
                  <Field label="Expected annual return" value={state.sipAnnualRate * 100} onChange={(v) => set("sipAnnualRate", v / 100)} suffix="% p.a." hint="Your assumption — not a forecast." />
                  <Field label="Annual step-up" value={state.sipAnnualStepUp * 100} onChange={(v) => set("sipAnnualStepUp", v / 100)} suffix="% per year" />
                </div>
                <div className="sheet px-5 py-3">
                  <LedgerRow label="Invested principal" value={formatINR(derived.sip.invested)} />
                  <LedgerRow label="Projected gain" value={formatINR(derived.sip.gain)} tone="green" />
                  <LedgerRow label="Projected value (SIP)" value={formatINR(derived.sip.futureValue)} emphasize />
                  <LedgerRow
                    label="With annual step-up"
                    value={formatINR(derived.stepUpSip.futureValue)}
                    tone="green"
                    sublabel={`Invested ${formatINR(derived.stepUpSip.invested)} at ${formatPercent(state.sipAnnualStepUp * 100, 0)}/yr step-up.`}
                  />
                  <LedgerRow
                    label="Real value (inflation-adjusted)"
                    value={formatINR(derived.sip.futureValue / Math.pow(1 + state.inflationRate, state.sipYears))}
                    tone="muted"
                  />
                </div>
                <div className="sheet px-5 py-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">Scenario comparison</span>
                    <Tag kind="estimate">Assumptions</Tag>
                  </div>
                  {scenarios.map((s) => {
                    const fv =
                      s.rate === state.sipAnnualRate
                        ? derived.sip.futureValue
                        : futureSip(state.sipMonthly, s.rate, state.sipYears);
                    return <LedgerRow key={s.rate} label={s.label} value={formatINR(fv)} />;
                  })}
                  <div className="mt-2">
                    <Assumption>
                      Returns are user assumptions, not guarantees. Past returns do not predict future returns. Inflation assumption {formatPercent(state.inflationRate * 100, 0)} → real return {formatPercent(derived.realReturn)} nominal-to-real.
                    </Assumption>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <div className="grid gap-10 lg:grid-cols-2">
            <Section index="13" title="Lump-sum investment" subtitle="FV = PV × (1 + i)^n with annual compounding.">
              <div className="sheet grid gap-4 px-5 py-4 sm:grid-cols-3">
                <Field label="Initial investment" value={state.lumpSumPrincipal} onChange={(v) => set("lumpSumPrincipal", v)} prefix="₹" />
                <Field label="Duration" value={state.lumpSumYears} onChange={(v) => set("lumpSumYears", v)} suffix="years" min={1} max={60} step="1" />
                <Field label="Annual return" value={state.lumpSumAnnualRate * 100} onChange={(v) => set("lumpSumAnnualRate", v / 100)} suffix="% p.a." />
              </div>
              <div className="sheet mt-4 px-5 py-3">
                <LedgerRow label="Principal" value={formatINR(derived.lumpSum.invested)} />
                <LedgerRow label="Gain" value={formatINR(derived.lumpSum.gain)} tone="green" />
                <LedgerRow label="Future value" value={formatINR(derived.lumpSum.futureValue)} emphasize />
              </div>
            </Section>

            <Section index="14" title="Rate assumptions" subtitle="Rates for products with notified or market-linked returns are user-entered — Arth never assumes they stay constant.">
              <div className="sheet px-5 py-4">
                <Field
                  label="Inflation rate"
                  value={state.inflationRate * 100}
                  onChange={(v) => set("inflationRate", v / 100)}
                  suffix="% p.a."
                  hint="Used for every real-return and retirement figure in the app."
                />
                <div className="mt-4">
                  <Assumption>
                    PPF, EPF and bank FD rates change; government-notified rates are revised periodically. Enter the current notified rate yourself rather than trusting a fixed default. NPS, equity, debt, gold and index funds are market-linked and not guaranteed.
                  </Assumption>
                </div>
              </div>
            </Section>
          </div>
        </div>
      ) : (
        <div className="fade-in space-y-10">
          <Section
            index="15"
            title="Portfolio tracker"
            subtitle="Manual holdings. Absolute return = ((current − invested) / invested) × 100. Annualised figures use holding-period CAGR where a purchase date exists — the two are never conflated."
            aside={<Tag kind="estimate">Valuations manually entered</Tag>}
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="sheet overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead>
                    <tr className="border-b border-ink/20 text-left">
                      <th className="px-3 py-2.5 font-medium text-muted">Asset</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted">Invested</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted">Current</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted">Gain</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted">Abs %</th>
                      <th className="px-3 py-2.5 text-right font-medium text-muted">Ann. %</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {derived.portfolio.assets.map((a) => (
                      <tr key={a.entry.id} className="border-b border-rule">
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{a.entry.name || "Untitled"}</div>
                          <div className="text-[11px] text-muted">{ASSET_CATEGORY_LABELS[a.entry.category]}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatINR(a.entry.invested)}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">{formatINR(a.entry.currentValue)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${a.gain >= 0 ? "text-ledger" : "text-debit"}`}>
                          {a.gain >= 0 ? "+" : "−"}
                          {formatINR(Math.abs(a.gain))}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${a.gain >= 0 ? "text-ledger" : "text-debit"}`}>
                          {formatPercent(a.gainPct)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-muted">
                          {a.annualisedPct === null ? "—" : formatPercent(a.annualisedPct)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            className="btn-ghost"
                            onClick={() => set("portfolio", state.portfolio.filter((p) => p.id !== a.entry.id))}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {derived.portfolio.assets.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-[13px] text-muted">
                          No holdings yet — add your investments below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="border-t border-rule px-3 py-3">
                  <button
                    className="btn-secondary"
                    onClick={() => set("portfolio", [...state.portfolio, EMPTY_ASSET()])}
                  >
                    + Add holding
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="sheet px-5 py-3">
                  <LedgerRow label="Total invested" value={formatINR(derived.portfolio.totalInvested)} />
                  <LedgerRow label="Current value" value={formatINR(derived.portfolio.totalValue)} emphasize />
                  <LedgerRow
                    label="Absolute gain/loss"
                    value={formatINR(derived.portfolio.totalGain)}
                    tone={derived.portfolio.totalGain >= 0 ? "green" : "debit"}
                    sublabel={formatPercent(derived.portfolio.totalGainPct)}
                  />
                  <LedgerRow
                    label="Annualised (weighted)"
                    value={derived.portfolio.annualisedPct === null ? "—" : formatPercent(derived.portfolio.annualisedPct)}
                    sublabel="Invested-weighted mean of per-asset CAGRs — not XIRR."
                  />
                  <LedgerRow
                    label="Weighted expected return"
                    value={derived.portfolio.weightedExpectedReturn === null ? "—" : formatPercent(derived.portfolio.weightedExpectedReturn * 100)}
                    tone="muted"
                    sublabel="From your own per-asset assumptions."
                  />
                  <LedgerRow label="Largest holding" value={`${formatPercent(derived.portfolio.topHoldingPct, 0)} · ${derived.portfolio.topHoldingName}`} sublabel={`Concentration index (HHI): ${Math.round(derived.portfolio.concentrationHhi)}`} />
                </div>

                <div className="sheet px-4 py-3">
                  <Donut
                    data={derived.portfolio.allocation.map((a) => ({ label: a.label, value: a.value }))}
                    centerLabel="Allocated"
                    centerValue={shortINR(derived.portfolio.totalValue)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="sheet px-5 py-4">
                <h3 className="statement-h text-[16px]">Edit holdings</h3>
                <div className="mt-4 space-y-5">
                  {state.portfolio.map((p, i) => (
                    <div key={p.id} className="border-t border-rule pt-4 first:border-t-0 first:pt-0">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">Asset name</span>
                          <input
                            type="text"
                            className="field-input font-sans"
                            value={p.name}
                            placeholder="e.g. Nifty 50 index fund"
                            onChange={(e) => {
                              const next = [...state.portfolio];
                              next[i] = { ...p, name: e.target.value };
                              set("portfolio", next);
                            }}
                          />
                        </label>
                        <label className="block">
                          <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">Category</span>
                          <select
                            className="mt-1 w-full border-b border-rule bg-transparent py-1.5 text-[14px] text-ink outline-none focus:border-ledger"
                            value={p.category}
                            onChange={(e) => {
                              const next = [...state.portfolio];
                              next[i] = { ...p, category: e.target.value as AssetCategory };
                              set("portfolio", next);
                            }}
                          >
                            {Object.entries(ASSET_CATEGORY_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </label>
                        <Field
                          label="Purchase date"
                          value={p.purchaseDate ? Date.parse(p.purchaseDate) / 86_400_000 : 0}
                          onChange={() => {}}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sheet px-5 py-4">
                <h3 className="statement-h text-[16px]">Add / edit amounts</h3>
                <div className="mt-4 space-y-6">
                  {state.portfolio.map((p, i) => {
                    const patch = (up: Partial<typeof p>) => {
                      const next = [...state.portfolio];
                      next[i] = { ...p, ...up };
                      set("portfolio", next);
                    };
                    return (
                      <div key={p.id} className="grid gap-4 border-t border-rule pt-4 first:border-t-0 first:pt-0 sm:grid-cols-2">
                        <Field label="Invested amount" value={p.invested} onChange={(v) => patch({ invested: v })} prefix="₹" />
                        <Field label="Current value" value={p.currentValue} onChange={(v) => patch({ currentValue: v })} prefix="₹" />
                        <Field label="Expected return" value={(p.expectedReturn ?? 0) * 100} onChange={(v) => patch({ expectedReturn: v / 100 })} suffix="% p.a." />
                        <Field label="Fees / taxes (if known)" value={p.fees ?? 0} onChange={(v) => patch({ fees: v })} prefix="₹" />
                        <label className="block">
                          <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">Purchase date</span>
                          <input
                            type="date"
                            className="field-input"
                            value={p.purchaseDate ?? ""}
                            onChange={(e) => patch({ purchaseDate: e.target.value })}
                          />
                        </label>
                        <div className="flex items-end gap-2">
                          <Segmented
                            label="Valuation source"
                            value={p.valuationSource}
                            onChange={(v) => patch({ valuationSource: v })}
                            options={[
                              { value: "manual", label: "Manual" },
                              { value: "marketData", label: "Market data" },
                            ]}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {state.portfolio.length === 0 && (
                    <p className="text-[13px] text-muted">No holdings to edit.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Callout tone="note">
                {derived.portfolio.hasLivePrices
                  ? "One or more holdings are marked as market-data valued. Arth has no live price feed in this build — treat those entries as manual until a licensed provider is connected, and verify dates and sources."
                  : "No live market-data provider is connected to this build. Every valuation is manually entered by you; the data source and timestamp are whatever you recorded."}
              </Callout>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}

/** Scenario SIP computed locally for the comparison rows. */
function futureSip(monthly: number, annualRate: number, years: number): number {
  const n = Math.round(years * 12);
  const r = annualRate / 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}
