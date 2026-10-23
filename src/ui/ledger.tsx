/**
 * Ledger UI primitives. The visual system: paper sheets, a red margin rule
 * with the section number set in the margin, ruled rows with dotted leaders,
 * and every rupee figure in IBM Plex Mono, right-aligned.
 */

import type { ReactNode } from "react";
import { formatINR, formatPercent, shortINR } from "../lib/format";

export function Sheet({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`sheet ${className}`}>{children}</div>;
}

/** Page section with the debit-red margin rule and number in the margin. */
export function Section({
  index,
  title,
  subtitle,
  aside,
  children,
}: {
  index?: string;
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="margin-rule pl-4 sm:pl-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-3">
          {index && (
            <span className="font-mono text-[11px] font-semibold tracking-widest text-debit">
              {index}
            </span>
          )}
          <h2 className="statement-h text-[19px] leading-tight sm:text-[22px]">{title}</h2>
        </div>
        {aside}
      </div>
      {subtitle && <div className="mt-1 max-w-[64ch] text-[13px] leading-relaxed text-muted">{subtitle}</div>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Label · dotted leader · value. The signature row of the product. */
export function LedgerRow({
  label,
  value,
  sublabel,
  emphasize,
  tone = "ink",
}: {
  label: ReactNode;
  value: ReactNode;
  sublabel?: ReactNode;
  emphasize?: boolean;
  tone?: "ink" | "green" | "debit" | "muted";
}) {
  const toneClass =
    tone === "green"
      ? "text-ledger"
      : tone === "debit"
        ? "text-debit"
        : tone === "muted"
          ? "text-muted"
          : "text-ink";
  return (
    <div className={emphasize ? "border-t border-ink/20 pt-3" : ""}>
      <div className="ledger-row">
        <span className={emphasize ? "text-[14px] font-semibold text-ink" : "text-[13px] text-muted"}>
          {label}
        </span>
        <span className="leader" aria-hidden="true" />
        <span
          className={`value ${toneClass} ${
            emphasize ? "text-[16px] font-semibold" : ""
          }`}
        >
          {value}
        </span>
      </div>
      {sublabel && <div className="-mt-2 pb-1 pl-0.5 text-[11.5px] text-muted">{sublabel}</div>}
    </div>
  );
}

/** A rupee amount in mono, optionally signed or compact. */
export function Money({
  value,
  compact = false,
  signed = false,
  className = "",
}: {
  value: number;
  compact?: boolean;
  signed?: boolean;
  className?: string;
}) {
  const text = compact ? shortINR(value) : formatINR(value);
  const prefix = signed ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  const color = signed ? (value > 0 ? "text-ledger" : value < 0 ? "text-debit" : "") : "";
  return (
    <span className={`font-mono tabular-nums ${color} ${className}`}>
      {prefix}
      {text}
    </span>
  );
}

export function Pct({ value, digits = 1 }: { value: number; digits?: number }) {
  return <span className="font-mono tabular-nums">{formatPercent(value, digits)}</span>;
}

/** Ochre estimate tag / green fact tag / red caution tag. */
export function Tag({
  kind,
  children,
}: {
  kind: "estimate" | "fact" | "caution";
  children: ReactNode;
}) {
  const cls =
    kind === "estimate" ? "tag-estimate" : kind === "fact" ? "tag-fact" : "tag-caution";
  return <span className={cls}>{children}</span>;
}

/** Assumption/disclosure block — ochre left border, never a gray whisper. */
export function Assumption({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-2 border-ochre/60 bg-ochre-wash/60 px-3 py-2 text-[12px] leading-relaxed text-ochre">
      <span className="font-semibold uppercase tracking-wider text-[10px]">Assumption · </span>
      {children}
    </div>
  );
}

export function Callout({
  tone = "caution",
  children,
}: {
  tone?: "caution" | "note";
  children: ReactNode;
}) {
  const cls =
    tone === "caution"
      ? "border-l-2 border-debit/60 bg-debit-wash/60 text-debit"
      : "border-l-2 border-ledger/60 bg-ledger-wash/60 text-ledger-deep";
  return <div className={`${cls} px-3 py-2 text-[12.5px] leading-relaxed`}>{children}</div>;
}

/** Underline input with optional ₹ prefix and suffix unit. */
export function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  min,
  max,
  step = "any",
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: ReactNode;
  min?: number;
  max?: number;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted">{label}</span>
      <span className="mt-0.5 flex items-baseline gap-1.5">
        {prefix && <span className="font-mono text-[15px] text-muted">{prefix}</span>}
        <input
          type="number"
          className="field-input"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isFinite(v) ? v : 0);
          }}
        />
        {suffix && <span className="text-[12px] text-muted">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-[11.5px] leading-snug text-muted">{hint}</span>}
    </label>
  );
}

/** Segmented control for 2–4 exclusive options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div>
      {label && (
        <span className="mb-1 block text-[11.5px] font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
      )}
      <div className="segmented" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Stat cell used on the overview ledger. */
export function Stat({
  label,
  value,
  footnote,
  tone = "ink",
}: {
  label: string;
  value: ReactNode;
  footnote?: ReactNode;
  tone?: "ink" | "green" | "debit";
}) {
  const color = tone === "green" ? "text-ledger" : tone === "debit" ? "text-debit" : "text-ink";
  return (
    <div className="px-4 py-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className={`mt-1 font-mono text-[20px] font-medium tabular-nums ${color}`}>{value}</div>
      {footnote && <div className="mt-0.5 text-[11px] text-muted">{footnote}</div>}
    </div>
  );
}
