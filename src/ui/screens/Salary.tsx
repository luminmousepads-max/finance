/** Salary — the CTC→take-home waterfall, posted as debits and credits. */

import { useStore } from "../../state/StoreContext";
import { formatINR, formatPercent } from "../../lib/format";
import { WaterfallChart } from "../charts";
import { Assumption, Callout, Field, LedgerRow, Section, Segmented, Tag } from "../ledger";
import { CTC_ESTIMATE_ASSUMPTIONS_NOTE } from "../../ui/onboarding-copy";

export function Salary() {
  const { state, set, derived } = useStore();
  const th = derived.takeHome;
  const s = derived.structure;

  return (
    <div className="fade-in space-y-10">
      <Section
        index="07"
        title="Salary & take-home"
        subtitle="How your CTC becomes money in the bank. Employer contributions leave CTC once and are never subtracted again."
        aside={
          <div className="flex items-center gap-2">
            <Segmented
              value={state.structureMode}
              onChange={(v) => set("structureMode", v)}
              options={[
                { value: "estimate", label: "Estimate from CTC" },
                { value: "detailed", label: "Salary slip" },
              ]}
            />
            <Tag kind={derived.isEstimateStructure ? "estimate" : "fact"}>
              {derived.isEstimateStructure ? "Estimate" : "From slip"}
            </Tag>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="sheet px-4 py-4">
            <h3 className="statement-h text-[16px]">Annual waterfall</h3>
            <WaterfallChart data={th.waterfall} />
          </div>

          <div className="space-y-4">
            <div className="sheet px-5 py-3">
              <LedgerRow label="Annual CTC" value={formatINR(th.ctc)} />
              <LedgerRow label="Gross salary" value={formatINR(th.grossSalary)} />
              <LedgerRow
                label="Employer PF + gratuity"
                value={formatINR(th.employerContributions)}
                tone="muted"
                sublabel="Retained in CTC — your retirement balance, not cash."
              />
              <LedgerRow label="Employee PF" value={formatINR(th.employeePf)} tone="debit" />
              <LedgerRow label="Professional tax" value={formatINR(th.professionalTax)} tone="debit" />
              <LedgerRow
                label="Income tax"
                value={formatINR(th.incomeTax)}
                tone="debit"
                sublabel={`${th.taxResult.regime === "new" ? "New" : "Old"} regime · ${state.fy}`}
              />
              <LedgerRow label="Annual take-home" value={formatINR(th.annualTakeHome)} emphasize tone="green" />
              <LedgerRow label="Monthly take-home (est.)" value={formatINR(th.monthlyTakeHome)} emphasize tone="green" />
            </div>

            <div className="sheet px-5 py-3">
              <LedgerRow
                label="Savings capacity"
                value={formatINR(Math.max(0, th.annualTakeHome - derived.budget.totalExpenses * 12) / 1)}
                tone="green"
                sublabel="Annual take-home minus budgeted expenses."
              />
              <LedgerRow
                label="Employer contributions (outside take-home)"
                value={formatINR(th.retainedOutsideTakeHome)}
                tone="muted"
              />
            </div>
          </div>
        </div>

        {derived.isEstimateStructure && (
          <div className="mt-5">
            <Assumption>{CTC_ESTIMATE_ASSUMPTIONS_NOTE}</Assumption>
          </div>
        )}

        {th.warnings.length > 0 && (
          <div className="mt-4 space-y-2">
            {th.warnings.map((w, i) => (
              <Callout key={i}>{w}</Callout>
            ))}
          </div>
        )}
      </Section>

      <Section
        index="08"
        title="Structure inputs"
        subtitle="Switch to salary-slip mode to enter exact components. In estimate mode these read-only values show what the assumptions produced."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Basic (annual)" value={derived.isEstimateStructure ? s.basic : state.basicAnnual} onChange={(v) => set("basicAnnual", v)} prefix="₹" disabled={derived.isEstimateStructure} />
          <Field label="HRA (annual)" value={derived.isEstimateStructure ? s.hra : state.hraAnnual} onChange={(v) => set("hraAnnual", v)} prefix="₹" disabled={derived.isEstimateStructure} />
          <Field label="Special allowance (annual)" value={derived.isEstimateStructure ? s.specialAllowance : state.specialAllowanceAnnual} onChange={(v) => set("specialAllowanceAnnual", v)} prefix="₹" disabled={derived.isEstimateStructure} />
          <Field label="Variable pay (annual)" value={derived.isEstimateStructure ? s.variablePay : state.variablePayAnnual} onChange={(v) => set("variablePayAnnual", v)} prefix="₹" disabled={derived.isEstimateStructure} />
          <Field label="Employer PF (annual)" value={derived.isEstimateStructure ? s.employerPf : state.employerPfAnnual} onChange={(v) => set("employerPfAnnual", v)} prefix="₹" disabled={derived.isEstimateStructure} />
          <Field label="Employee PF (annual)" value={derived.isEstimateStructure ? s.employeePf : state.employeePfAnnual} onChange={(v) => set("employeePfAnnual", v)} prefix="₹" disabled={derived.isEstimateStructure} />
          <Field label="Gratuity in CTC (annual)" value={derived.isEstimateStructure ? s.gratuityInCtc : state.gratuityInCtcAnnual} onChange={(v) => set("gratuityInCtcAnnual", v)} prefix="₹" disabled={derived.isEstimateStructure} />
          <Field label="Professional tax" value={state.professionalTaxMonthly} onChange={(v) => set("professionalTaxMonthly", v)} prefix="₹" suffix="/ month" />
          <Field label="Rent paid" value={state.rentMonthly} onChange={(v) => set("rentMonthly", v)} prefix="₹" suffix="/ month" hint="Old-regime HRA exemption only." />
          <Field label="Other income (annual)" value={state.otherIncomeAnnual} onChange={(v) => set("otherIncomeAnnual", v)} prefix="₹" />
          <div className="flex items-end">
            <Segmented
              label="City category"
              value={state.cityCategory}
              onChange={(v) => set("cityCategory", v)}
              options={[
                { value: "metro", label: "Metro" },
                { value: "nonMetro", label: "Non-metro" },
              ]}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="sheet px-5 py-3">
            <h3 className="statement-h text-[15px]">Taxable income build-up</h3>
            <LedgerRow label="Gross salary" value={formatINR(th.taxableBuild.grossSalary)} />
            <LedgerRow label="+ Other income" value={formatINR(th.taxableBuild.otherIncome)} />
            <LedgerRow label="− Standard deduction" value={formatINR(th.taxableBuild.standardDeduction)} tone="debit" />
            <LedgerRow label="− HRA exemption" value={formatINR(th.taxableBuild.hraExemption)} tone="debit" />
            <LedgerRow label="− Sec 80C" value={formatINR(th.taxableBuild.deductions80C)} tone="debit" />
            <LedgerRow label="− Sec 80D" value={formatINR(th.taxableBuild.deductions80D)} tone="debit" />
            <LedgerRow label="− Sec 24(b)" value={formatINR(th.taxableBuild.homeLoanInterest24b)} tone="debit" />
            <LedgerRow label="− Other Ch VI-A" value={formatINR(th.taxableBuild.otherChapterVIA)} tone="debit" />
            <LedgerRow label="Taxable income" value={formatINR(th.taxableIncome)} emphasize />
          </div>

          <div className="sheet px-5 py-3">
            <h3 className="statement-h text-[15px]">Old-regime deductions</h3>
            <p className="mt-1 text-[12px] text-muted">
              Applied only when the old regime is selected — the new regime legally disallows them.
            </p>
            <div className="mt-3 grid gap-4">
              <Field label="Sec 80C" value={state.section80C} onChange={(v) => set("section80C", v)} prefix="₹" hint="₹1,50,000 statutory cap." />
              <Field label="Sec 80D" value={state.section80D} onChange={(v) => set("section80D", v)} prefix="₹" hint="Health insurance premium." />
              <Field label="Sec 24(b) home-loan interest" value={state.homeLoanInterest24b} onChange={(v) => set("homeLoanInterest24b", v)} prefix="₹" hint="Self-occupied, ₹2,00,000 cap." />
              <Field label="Other Ch VI-A" value={state.otherChapterVIA} onChange={(v) => set("otherChapterVIA", v)} prefix="₹" />
            </div>
          </div>
        </div>

        <div className="sheet mt-5 px-5 py-3">
          <LedgerRow
            label="Effective tax rate"
            value={formatPercent(th.taxResult.effectiveRate)}
            sublabel="Total tax ÷ taxable income."
          />
          <LedgerRow
            label="Marginal tax rate"
            value={formatPercent(th.taxResult.marginalRate, 0)}
            sublabel="Rate applied to the next ₹1,000 you earn, at this income level."
          />
        </div>
      </Section>
    </div>
  );
}
