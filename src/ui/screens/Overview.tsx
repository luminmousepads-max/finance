/** Overview — the key figures posted on one ruled page. */

import { useStore } from "../../state/StoreContext";
import { formatINR, formatLPA, formatPercent, shortINR } from "../../lib/format";
import { Donut, GrowthArea } from "../charts";
import { Callout, LedgerRow, Section, Stat, Tag } from "../ledger";

export function Overview() {
  const { state, derived } = useStore();
  const th = derived.takeHome;
  const pf = derived.portfolio;

  const salarySplit = [
    { label: "Take-home", value: Math.max(0, th.annualTakeHome) },
    { label: "Income tax", value: th.incomeTax },
    { label: "Employee PF", value: th.employeePf },
    { label: "Prof. tax", value: th.professionalTax },
    { label: "Employer PF + gratuity", value: th.employerContributions },
  ].filter((d) => d.value > 0);

  const goalProgress = derived.goals.results;

  return (
    <div className="fade-in space-y-10">
      <Section
        index="01"
        title="Overview"
        subtitle={`Every figure below is produced by the calculation engine from your inputs — ${state.fy}, ${state.regime === "new" ? "new" : "old"} regime. No figure is hardcoded or rounded into a nice story.`}
        aside={
          <div className="flex gap-2">
            <Tag kind={derived.isEstimateStructure ? "estimate" : "fact"}>
              {derived.isEstimateStructure ? "Estimated structure" : "Salary-slip"}
            </Tag>
            <Tag kind="fact">{state.fy}</Tag>
          </div>
        }
      >
        <div className="sheet grid grid-cols-1 divide-x divide-y divide-rule sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Annual CTC" value={formatLPA(state.salaryLpa)} footnote={formatINR(derived.annualAmount)} />
          <Stat
            label="Monthly take-home (est.)"
            value={formatINR(th.monthlyTakeHome)}
            footnote={`Annual ${formatINR(th.annualTakeHome)}`}
            tone="green"
          />
          <Stat
            label="Annual income tax"
            value={formatINR(th.incomeTax)}
            footnote={`Effective ${formatPercent(th.taxResult.effectiveRate)}`}
            tone="debit"
          />
          <Stat
            label="Monthly expenses"
            value={formatINR(derived.summary.monthlyExpenses)}
            footnote={
              derived.summary.source === "budget"
                ? "From budget planner"
                : derived.summary.source === "profile"
                  ? "From your profile — open Budget to break it down"
                  : "Not set yet"
            }
          />
          <Stat
            label="Monthly savings surplus"
            value={formatINR(derived.summary.monthlySurplus)}
            footnote={`Savings rate ${formatPercent(derived.summary.savingsRate)}`}
            tone={derived.summary.monthlySurplus >= 0 ? "green" : "debit"}
          />
          <Stat
            label="Investment portfolio"
            value={formatINR(pf.totalValue)}
            footnote={
              pf.assets.length > 0
                ? `${pf.totalGain >= 0 ? "+" : "−"}${formatINR(Math.abs(pf.totalGain))} (${formatPercent(pf.totalGainPct)})`
                : "Add holdings in Investments"
            }
            tone={pf.totalGain >= 0 ? "green" : "debit"}
          />
          <Stat
            label="Projected wealth (SIP)"
            value={shortINR(derived.sip.futureValue)}
            footnote={`${formatINR(state.sipMonthly)}/mo for ${state.sipYears}y @ ${formatPercent(state.sipAnnualRate * 100, 0)}`}
          />
          <Stat
            label="Goal funding required"
            value={formatINR(derived.goals.totalRequiredMonthly)}
            footnote={
              goalProgress.length > 0
                ? `${goalProgress.length} goal(s) · ${formatPercent(derived.goals.utilisationPct, 0)} of surplus`
                : "No goals set yet"
            }
          />
        </div>

        {derived.warnings.length > 0 && (
          <div className="mt-4 space-y-2">
            {derived.warnings.slice(0, 3).map((w, i) => (
              <Callout key={i}>{w}</Callout>
            ))}
          </div>
        )}
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section
          index="02"
          title="Where the salary goes"
          subtitle="CTC split into what reaches you, what the government takes, and what is retained as retirement savings."
        >
          <div className="sheet px-2 pt-2">
            <Donut
              data={salarySplit}
              centerLabel="Take-home"
              centerValue={shortINR(th.annualTakeHome)}
            />
          </div>
          <div className="sheet mt-4 px-4 py-2">
            <LedgerRow label="Employer PF + gratuity (retained)" value={formatINR(th.employerContributions)} tone="muted" sublabel="Not take-home cash — your retirement balance grows instead." />
            <LedgerRow label="Total payroll deductions" value={formatINR(th.employeePf + th.professionalTax + th.incomeTax)} tone="debit" />
          </div>
        </Section>

        <Section
          index="03"
          title="Investment growth"
          subtitle={`SIP of ${formatINR(state.sipMonthly)}/month for ${state.sipYears} years at ${formatPercent(state.sipAnnualRate * 100, 0)} nominal. Assumption, not a forecast.`}
        >
          <div className="sheet px-2 py-2">
            <GrowthArea data={derived.sipProjection} xLabel="Year" />
          </div>
          <div className="sheet mt-4 px-4 py-2">
            <LedgerRow label="Invested principal" value={formatINR(derived.sip.invested)} />
            <LedgerRow label="Projected gain" value={formatINR(derived.sip.gain)} tone="green" />
            <LedgerRow label="Projected value" value={formatINR(derived.sip.futureValue)} emphasize />
            <LedgerRow
              label="Real value (after inflation)"
              value={formatINR(
                derived.sip.futureValue / Math.pow(1 + state.inflationRate, state.sipYears)
              )}
              tone="muted"
              sublabel={`Inflation assumption ${formatPercent(state.inflationRate * 100, 0)} · real return ${formatPercent(derived.realReturn * 100)}`}
            />
          </div>
        </Section>
      </div>
    </div>
  );
}
