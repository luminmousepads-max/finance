/** Copy strings for onboarding disclosures — kept out of component logic. */

export const CTC_ESTIMATE_ASSUMPTIONS_NOTE =
  "Basic is assumed at 40% of CTC, HRA at 50% of basic, employer PF at 12% of basic, and gratuity accrual at 15 days' wages per year of service. Special allowance absorbs the remainder. These are disclosed assumptions, not payroll facts — enter real components for an exact breakdown.";

export const REGIME_NOTES: Record<"new" | "old", string> = {
  new: "The new regime (Sec 115BAC) is the default. It offers wider slabs and a ₹75,000 standard deduction, but allows no HRA exemption, no 80C/80D, and no Sec 24(b) home-loan interest deduction.",
  old: "The old regime keeps HRA exemption, 80C (₹1.5L cap), 80D, and Sec 24(b) (₹2L cap on self-occupied loan interest), but its slabs are narrower and the standard deduction is ₹50,000.",
};

export const BASIS_NOTES: Record<"ctc" | "gross" | "taxable", string> = {
  ctc: "CTC (cost to company) includes employer PF and gratuity accrual — money that is yours but never reaches your bank account. Arth will separate it out.",
  gross: "Gross salary is the annual earnings before payroll deductions — typically basic + HRA + allowances + variable pay.",
  taxable: "Taxable salary is what remains after exemptions and deductions. Choosing this skips the CTC→gross step; enter the salary-structure details for take-home.",
};

export const FY_NOTES = {
  "FY 2023-24": "Rules as notified by the Finance (No. 2) Act, 2023. Kept for past-year planning and returns.",
  "FY 2024-25": "Rules as notified by the Finance Act, 2024. New-regime standard deduction ₹75,000; 87A rebate ₹25,000 up to ₹7L taxable.",
  "FY 2025-26": "Rules as notified by the Finance Act, 2025. New-regime slabs 4/8/12/16/20/24L; 87A rebate ₹60,000 up to ₹12L taxable, with marginal relief above it.",
};
