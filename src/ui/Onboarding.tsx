/**
 * Onboarding — the two-page spread. Left page: questions. Right page: your
 * ledger, posting live as you type. Step 1 collects LPA and context; step 2
 * (structure) and step 3 (profile) are skippable — CTC alone is enough.
 */

import { useState } from "react";
import { useStore } from "../state/StoreContext";
import { formatINR, formatLPA } from "../lib/format";
import {
  Assumption,
  Callout,
  Field,
  LedgerRow,
  Segmented,
  Tag,
} from "./ledger";
import {
  BASIS_NOTES,
  CTC_ESTIMATE_ASSUMPTIONS_NOTE,
  FY_NOTES,
  REGIME_NOTES,
} from "./onboarding-copy";
import { SUPPORTED_FY } from "../engine/tax/tax-engine";
import type { SupportedFY } from "../engine/tax/tax-engine";

type Step = 1 | 2 | 3;

export function Onboarding() {
  const { state, set, derived } = useStore();
  const [step, setStep] = useState<Step>(1);
  const th = derived.takeHome;

  const lpaError =
    state.salaryLpa < 0
      ? "Salary cannot be negative."
      : state.salaryLpa > 0 && state.salaryLpa < 0.5
        ? "That is under ₹50,000/year — check the unit (LPA, not monthly)."
        : state.salaryLpa >= 10_000
          ? "That looks like rupees, not LPA. Enter lakhs per annum (e.g. 12.5)."
          : null;

  return (
    <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 lg:grid-cols-[1fr_400px] lg:py-16">
      {/* LEFT PAGE — questions */}
      <div className="margin-rule pl-5 sm:pl-7">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] font-semibold tracking-widest text-debit">
            {String(step).padStart(2, "0")}
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Step {step} of 3
          </span>
        </div>

        {step === 1 && (
          <div className="fade-in mt-4">
            <h1 className="statement-h text-[34px] leading-[1.1] sm:text-[42px]">
              Let's understand
              <br />
              your finances.
            </h1>
            <p className="mt-3 max-w-[52ch] text-[14px] leading-relaxed text-muted">
              Arth computes your Indian income tax, take-home pay, investments, EMIs,
              retirement and goals using real formulas. Nothing is invented — every figure
              shows its assumptions. Everything stays in this browser.
            </p>

            <div className="mt-8 max-w-[420px]">
              <Field
                label="What is your annual salary?"
                value={state.salaryLpa}
                onChange={(v) => set("salaryLpa", v)}
                suffix="LPA (lakhs per annum)"
                hint="Decimals are fine — 4.5, 8, 12.5, 25."
              />
              {lpaError && (
                <div className="mt-2">
                  <Callout>{lpaError}</Callout>
                </div>
              )}
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Segmented
                label="What kind of salary is this?"
                value={state.salaryBasis}
                onChange={(v) => set("salaryBasis", v)}
                options={[
                  { value: "ctc", label: "CTC" },
                  { value: "gross", label: "Gross" },
                  { value: "taxable", label: "Taxable" },
                ]}
              />
              <Segmented
                label="Which regime are you evaluating?"
                value={state.regime}
                onChange={(v) => set("regime", v)}
                options={[
                  { value: "new", label: "New" },
                  { value: "old", label: "Old" },
                ]}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Assumption>{BASIS_NOTES[state.salaryBasis]}</Assumption>
              <Assumption>{REGIME_NOTES[state.regime]}</Assumption>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <Segmented
                label="Employment type"
                value={state.employment}
                onChange={(v) => set("employment", v)}
                options={[
                  { value: "salaried", label: "Salaried" },
                  { value: "selfEmployed", label: "Self-employed" },
                  { value: "businessOwner", label: "Business owner" },
                ]}
              />
              <label className="block">
                <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">
                  Financial year
                </span>
                <select
                  className="mt-1 w-full border-b border-rule bg-transparent py-1.5 text-[15px] text-ink outline-none focus:border-ledger"
                  value={state.fy}
                  onChange={(e) => set("fy", e.target.value as SupportedFY)}
                >
                  {SUPPORTED_FY.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11.5px] leading-snug text-muted">
                  {FY_NOTES[state.fy]}
                </span>
              </label>
            </div>

            <div className="mt-9 flex items-center gap-3">
              <button
                className="btn-primary"
                disabled={state.salaryLpa <= 0 || !!lpaError}
                onClick={() => setStep(2)}
              >
                Post this to my ledger →
              </button>
              <span className="text-[12px] text-muted">Steps 2–3 are optional</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in mt-4">
            <h1 className="statement-h text-[30px] leading-tight sm:text-[36px]">
              Salary structure
            </h1>
            <p className="mt-2 max-w-[54ch] text-[13.5px] leading-relaxed text-muted">
              Needed for an exact take-home figure. You can skip this entirely — with only
              your CTC, Arth estimates the structure using disclosed assumptions and labels
              every resulting number as an estimate.
            </p>

            <div className="mt-6">
              <Segmented
                label="Mode"
                value={state.structureMode}
                onChange={(v) => set("structureMode", v)}
                options={[
                  { value: "estimate", label: "Estimate from CTC" },
                  { value: "detailed", label: "Enter salary slip" },
                ]}
              />
            </div>

            {state.structureMode === "estimate" ? (
              <div className="mt-5 max-w-[560px]">
                <Assumption>{CTC_ESTIMATE_ASSUMPTIONS_NOTE}</Assumption>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <Segmented
                    label="City category (for HRA exemption)"
                    value={state.cityCategory}
                    onChange={(v) => set("cityCategory", v)}
                    options={[
                      { value: "metro", label: "Metro" },
                      { value: "nonMetro", label: "Non-metro" },
                    ]}
                  />
                  <Field
                    label="Professional tax"
                    value={state.professionalTaxMonthly}
                    onChange={(v) => set("professionalTaxMonthly", v)}
                    prefix="₹"
                    suffix="/ month"
                    hint="Varies by state; ₹200/month is common (₹2,500/yr constitutional cap)."
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 grid max-w-[640px] gap-5 sm:grid-cols-2">
                <Field label="Basic (annual)" value={state.basicAnnual} onChange={(v) => set("basicAnnual", v)} prefix="₹" />
                <Field label="HRA (annual)" value={state.hraAnnual} onChange={(v) => set("hraAnnual", v)} prefix="₹" />
                <Field label="Special allowance (annual)" value={state.specialAllowanceAnnual} onChange={(v) => set("specialAllowanceAnnual", v)} prefix="₹" />
                <Field label="Variable pay / bonus (annual)" value={state.variablePayAnnual} onChange={(v) => set("variablePayAnnual", v)} prefix="₹" />
                <Field label="Employer PF (annual)" value={state.employerPfAnnual} onChange={(v) => set("employerPfAnnual", v)} prefix="₹" hint="Part of CTC, not take-home." />
                <Field label="Employee PF (annual)" value={state.employeePfAnnual} onChange={(v) => set("employeePfAnnual", v)} prefix="₹" />
                <Field label="Gratuity in CTC (annual accrual)" value={state.gratuityInCtcAnnual} onChange={(v) => set("gratuityInCtcAnnual", v)} prefix="₹" />
                <Field label="Other taxable benefits (annual)" value={state.otherBenefitsAnnual} onChange={(v) => set("otherBenefitsAnnual", v)} prefix="₹" />
                <Field label="Other payroll deductions (annual)" value={state.otherDeductionsAnnual} onChange={(v) => set("otherDeductionsAnnual", v)} prefix="₹" />
                <Field label="Professional tax" value={state.professionalTaxMonthly} onChange={(v) => set("professionalTaxMonthly", v)} prefix="₹" suffix="/ month" />
                <Field
                  label="Rent paid"
                  value={state.rentMonthly}
                  onChange={(v) => set("rentMonthly", v)}
                  prefix="₹"
                  suffix="/ month"
                  hint="Used for HRA exemption — old regime only."
                />
                <Field label="Other income (annual)" value={state.otherIncomeAnnual} onChange={(v) => set("otherIncomeAnnual", v)} prefix="₹" hint="Rent, interest, freelance, etc." />
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
            )}

            {state.regime === "old" && state.structureMode === "detailed" && (
              <div className="mt-8 max-w-[640px]">
                <h3 className="statement-h text-[17px]">Old-regime deductions</h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <Field label="Sec 80C" value={state.section80C} onChange={(v) => set("section80C", v)} prefix="₹" hint="EPF, PPF, ELSS, life insurance… ₹1.5L cap." />
                  <Field label="Sec 80D" value={state.section80D} onChange={(v) => set("section80D", v)} prefix="₹" hint="Health insurance premium." />
                  <Field label="Sec 24(b) home-loan interest" value={state.homeLoanInterest24b} onChange={(v) => set("homeLoanInterest24b", v)} prefix="₹" hint="Self-occupied property, ₹2L cap." />
                  <Field label="Other Ch VI-A deductions" value={state.otherChapterVIA} onChange={(v) => set("otherChapterVIA", v)} prefix="₹" />
                </div>
              </div>
            )}

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={() => setStep(3)}>
                Continue →
              </button>
              <button className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  set("onboarded", true);
                }}
              >
                Skip — use CTC estimate only
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in mt-4">
            <h1 className="statement-h text-[30px] leading-tight sm:text-[36px]">
              Personal profile
            </h1>
            <p className="mt-2 max-w-[54ch] text-[13.5px] leading-relaxed text-muted">
              All optional. These tune tax slabs, the emergency-fund target, and the
              retirement horizon. Skip anything you'd rather not share — this data never
              leaves your browser.
            </p>

            <div className="mt-6 grid max-w-[640px] gap-5 sm:grid-cols-2">
              <Field
                label="Age"
                value={state.age}
                onChange={(v) => set("age", v)}
                suffix="years"
                min={18}
                max={100}
                step="1"
                hint="Drives old-regime senior-citizen slabs."
              />
              <label className="block">
                <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">
                  City & state
                </span>
                <input
                  type="text"
                  className="field-input font-sans"
                  placeholder="e.g. Pune, Maharashtra"
                  value={state.city}
                  onChange={(e) => set("city", e.target.value)}
                />
                <span className="mt-1 block text-[11.5px] leading-snug text-muted">
                  Used only to label your ledger. Nothing is sent anywhere.
                </span>
              </label>
              <Field
                label="Dependents"
                value={state.dependents}
                onChange={(v) => set("dependents", v)}
                min={0}
                max={20}
                step="1"
              />
              <Field
                label="Expected retirement age"
                value={state.retirementAgeTarget}
                onChange={(v) => set("retirementAgeTarget", v)}
                min={40}
                max={80}
                step="1"
              />
              <Field
                label="Monthly household expenses"
                value={state.monthlyExpenses}
                onChange={(v) => set("monthlyExpenses", v)}
                prefix="₹"
                suffix="/ month"
              />
              <Field
                label="Current savings & emergency funds"
                value={state.currentSavings}
                onChange={(v) => set("currentSavings", v)}
                prefix="₹"
              />
              <Field
                label="Existing loan EMIs"
                value={state.existingEmiMonthly}
                onChange={(v) => set("existingEmiMonthly", v)}
                prefix="₹"
                suffix="/ month"
              />
              <Field
                label="Current investments"
                value={state.currentInvestmentsMonthly}
                onChange={(v) => set("currentInvestmentsMonthly", v)}
                prefix="₹"
                suffix="/ month"
              />
            </div>

            <div className="mt-6 max-w-[420px]">
              <Segmented
                label="Risk tolerance"
                value={state.riskTolerance}
                onChange={(v) => set("riskTolerance", v)}
                options={[
                  { value: "conservative", label: "Conservative" },
                  { value: "moderate", label: "Moderate" },
                  { value: "aggressive", label: "Aggressive" },
                ]}
              />
              <p className="mt-2 text-[11.5px] leading-snug text-muted">
                Suggests default return assumptions in the calculators. You can override
                every rate — nothing is locked in.
              </p>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={() => set("onboarded", true)}>
                Open my ledger →
              </button>
              <button className="btn-secondary" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="btn-ghost" onClick={() => set("onboarded", true)}>
                Skip
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PAGE — live ledger */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="sheet ruled px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted">Your entry</span>
            <Tag kind={derived.isEstimateStructure ? "estimate" : "fact"}>
              {derived.isEstimateStructure ? "Estimated structure" : "Salary-slip mode"}
            </Tag>
          </div>

          <div className="mt-3">
            <LedgerRow label="Annual salary" value={formatLPA(state.salaryLpa)} />
            <LedgerRow label="In rupees" value={formatINR(derived.annualAmount)} />
            <LedgerRow label="Financial year" value={state.fy} />
            <LedgerRow label="Regime" value={state.regime === "new" ? "New (default)" : "Old"} />

            {state.salaryLpa > 0 && (
              <>
                <div className="mt-2 border-t border-ink/20 pt-2">
                  <LedgerRow label="Gross salary" value={formatINR(th.grossSalary)} />
                  <LedgerRow label="Taxable income" value={formatINR(th.taxableIncome)} />
                  <LedgerRow
                    label="Income tax (annual)"
                    value={formatINR(th.incomeTax)}
                    tone={th.incomeTax > 0 ? "debit" : "green"}
                  />
                  <LedgerRow
                    label="Monthly TDS (est.)"
                    value={formatINR(th.taxResult.totalTax / 12)}
                    tone="muted"
                  />
                  <LedgerRow
                    label="Take-home / month"
                    value={formatINR(th.monthlyTakeHome)}
                    emphasize
                    tone="green"
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Tag kind="fact">
                    Effective rate {th.taxResult.effectiveRate.toFixed(1)}%
                  </Tag>
                  <Tag kind="fact">
                    Marginal rate {th.taxResult.marginalRate.toFixed(0)}%
                  </Tag>
                </div>
              </>
            )}

            {state.salaryLpa > 0 && derived.isEstimateStructure && (
              <div className="mt-3">
                <Assumption>
                  The split above uses the disclosed CTC assumptions. Enter your salary slip
                  in step 2 for the exact structure.
                </Assumption>
              </div>
            )}

            {state.salaryLpa === 0 && (
              <div className="mt-4 text-[12.5px] leading-relaxed text-muted">
                Your ledger is blank. Enter your LPA on the left and it will post here —
                live, as you type.
              </div>
            )}
          </div>
        </div>

        <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted">
          Stored locally in this browser only. No accounts, no servers, no bank access.
          You can export or delete everything from Settings.
        </p>
      </aside>
    </div>
  );
}
