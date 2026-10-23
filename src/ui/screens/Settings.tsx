/** Settings — data storage disclosure, export/import/delete, app info. */

import { useRef, useState } from "react";
import { useStore } from "../../state/StoreContext";
import { SUPPORTED_FY, getTaxYearConfig } from "../../engine/tax/tax-engine";
import { formatINR } from "../../lib/format";
import { Callout, Field, LedgerRow, Section, Segmented, Tag } from "../ledger";

export function Settings() {
  const { state, set, exportJson, importJson, wipe, reset } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `arth-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Exported your data as JSON.");
  };

  const doImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importJson(String(reader.result));
      setMsg(ok ? "Imported successfully." : "Import failed — invalid JSON file.");
    };
    reader.readAsText(file);
  };

  const doWipe = () => {
    if (
      window.confirm(
        "Delete all Arth data stored in this browser? This removes every input and cannot be undone (export first if you want a copy)."
      )
    ) {
      wipe();
      setMsg("All locally stored data deleted.");
    }
  };

  return (
    <div className="fade-in space-y-10">
      <Section
        index="21"
        title="Settings"
        subtitle="Arth is a local-only experience in this build. There are no accounts, no server, and no bank connections."
        aside={<Tag kind="fact">Local storage</Tag>}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="sheet px-5 py-4">
            <h3 className="statement-h text-[16px]">Where your data lives</h3>
            <div className="mt-3 space-y-3 text-[13px] leading-relaxed text-muted">
              <p>
                Every input and computed result is stored in{" "}
                <span className="font-mono text-ink">localStorage</span> under the key{" "}
                <span className="font-mono text-ink">arth:v1</span>, in this browser only. No
                data is transmitted anywhere — the app makes no network requests with your
                financial figures.
              </p>
              <p>
                Arth does not connect bank accounts, read credit reports, or store banking
                credentials, card PINs or OTPs. Clearing your browser data or using a private
                window removes it. There is no account system, so no compliance certifications
                are claimed.
              </p>
              <p className="text-ochre">
                Demo note: figures shown are computed from whatever you entered — treat them as
                your own entries, not verified payroll or portfolio data.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="btn-primary" onClick={doExport}>Export my data</button>
              <button className="btn-secondary" onClick={() => fileRef.current?.click()}>
                Import data
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) doImport(f);
                  e.target.value = "";
                }}
              />
              <button className="btn-secondary text-debit" onClick={doWipe}>
                Delete all data
              </button>
            </div>
            {msg && (
              <div className="mt-3">
                <Callout tone="note">{msg}</Callout>
              </div>
            )}
          </div>

          <div className="sheet px-5 py-4">
            <h3 className="statement-h text-[16px]">Calculation preferences</h3>
            <div className="mt-4 space-y-5">
              <Segmented
                label="Tax regime"
                value={state.regime}
                onChange={(v) => set("regime", v)}
                options={[
                  { value: "new", label: "New (default)" },
                  { value: "old", label: "Old" },
                ]}
              />
              <label className="block">
                <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">
                  Financial year
                </span>
                <select
                  className="mt-1 w-full border-b border-rule bg-transparent py-1.5 text-[15px] text-ink outline-none focus:border-ledger"
                  value={state.fy}
                  onChange={(e) => set("fy", e.target.value as (typeof SUPPORTED_FY)[number])}
                >
                  {SUPPORTED_FY.map((fy) => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
              </label>
              <Segmented
                label="Salary structure mode"
                value={state.structureMode}
                onChange={(v) => set("structureMode", v)}
                options={[
                  { value: "estimate", label: "Estimate from CTC" },
                  { value: "detailed", label: "Salary slip" },
                ]}
              />
              <Field
                label="Inflation assumption"
                value={state.inflationRate * 100}
                onChange={(v) => set("inflationRate", v / 100)}
                suffix="% p.a."
                hint="Used across real-return and retirement calculations."
              />
            </div>
            <div className="mt-5 border-t border-rule pt-4">
              <button
                className="btn-secondary"
                onClick={() => {
                  if (window.confirm("Reset all inputs to defaults (keeps the app onboarded)?")) {
                    reset();
                    setMsg("Inputs reset to defaults.");
                  }
                }}
              >
                Reset inputs to defaults
              </button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        index="22"
        title="Supported financial years"
        subtitle="Tax rules are configuration, not code. Each year below carries its own slabs, rebate, surcharge and source provenance."
      >
        <div className="sheet divide-y divide-rule">
          {SUPPORTED_FY.map((fy) => {
            const cfg = getTaxYearConfig(fy);
            return (
              <div key={fy} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="statement-h text-[15px]">
                    {cfg.fy} · {cfg.ay}
                  </span>
                  <span className="font-mono text-[11.5px] text-muted">Effective {cfg.effectiveFrom}</span>
                </div>
                <div className="mt-2 grid gap-x-8 gap-y-1 sm:grid-cols-2">
                  <LedgerRow label="New-regime standard deduction" value={formatINR(cfg.newRegime.standardDeduction)} />
                  <LedgerRow label="Old-regime standard deduction" value={formatINR(cfg.oldRegime.standardDeduction)} />
                  <LedgerRow
                    label="87A rebate (new / old)"
                    value={`${formatINR(cfg.newRegime.rebate87A.maxRebate)} / ${formatINR(cfg.oldRegime.rebate87A.maxRebate)}`}
                  />
                  <LedgerRow label="Cess" value={`${(cfg.cess * 100).toFixed(0)}%`} />
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  {cfg.sources.map((s) => (
                    <a
                      key={s.url}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11.5px] text-ledger underline underline-offset-2 hover:text-ledger-deep"
                    >
                      {s.name}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section index="23" title="About Arth" subtitle="Understand your money. Plan your future.">
        <div className="sheet px-5 py-4 text-[13px] leading-relaxed text-muted">
          <p>
            Arth computes tax, take-home pay, budgets, SIPs, EMIs, retirement and goals with
            formulas written in a separate, unit-tested calculation engine — never by
            hardcoded results. Every displayed figure can be traced to the inputs above.
          </p>
          <p className="mt-3">
            The assistant explains those computed outputs in plain language. It is an
            educational planning tool: it does not recommend buying or selling, does not
            guarantee returns, does not invent deductions, and is not a registered financial
            adviser. Consult a qualified professional before acting.
          </p>
        </div>
      </Section>
    </div>
  );
}
