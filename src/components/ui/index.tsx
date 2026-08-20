import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Button */

type ButtonVariant = "primary" | "gold" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-maroon-bright text-white shadow-md hover:-translate-y-0.5",
  gold: "bg-gold-grad text-maroon-900 shadow-md hover:-translate-y-0.5",
  outline:
    "border-2 border-maroon-600 text-maroon-600 hover:bg-maroon-600 hover:text-white",
  ghost: "text-maroon-600 hover:bg-maroon-50",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-2.5 text-sm",
  lg: "px-8 py-3.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <Link
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...props}
    />
  );
}

/* ------------------------------------------------------------------ Card */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

/* ----------------------------------------------------------------- Badge */

const BADGE_TONES = {
  neutral: "bg-gray-100 text-gray-700",
  maroon: "bg-maroon-50 text-maroon-600",
  gold: "bg-amber-50 text-amber-700",
  green: "bg-green-50 text-green-700",
  red: "bg-red-50 text-red-700",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof BADGE_TONES }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/** Maps an approval status to a labelled badge. */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: keyof typeof BADGE_TONES; label: string }> = {
    approved: { tone: "green", label: "Disetujui" },
    pending: { tone: "gold", label: "Menunggu" },
    rejected: { tone: "red", label: "Ditolak" },
  };
  const s = map[status] ?? { tone: "neutral" as const, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

/* ----------------------------------------------------------- Page header */

export function PageHero({ title, desc }: { title: string; desc?: string }) {
  return (
    <section className="bg-maroon-deep pattern-geo relative pb-16 pt-32">
      <div className="shell relative text-center">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          {title}
        </h1>
        <div className="gold-rule mx-auto mt-5 w-28" />
        {desc && <p className="mx-auto mt-5 max-w-2xl text-white/75">{desc}</p>}
      </div>
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  desc,
  light = false,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
  light?: boolean;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && (
        <div
          className={cn(
            "mb-3 text-xs font-bold uppercase tracking-[.18em]",
            light ? "text-gold-300" : "text-gold-500",
          )}
        >
          {eyebrow}
        </div>
      )}
      <h2
        className={cn(
          "font-display text-3xl font-extrabold tracking-tight text-balance sm:text-4xl",
          light ? "text-white" : "text-maroon-900",
        )}
      >
        {title}
      </h2>
      <div className={cn("gold-rule mt-5 w-24", center && "mx-auto")} />
      {desc && (
        <p className={cn("mt-5 leading-relaxed", light ? "text-white/75" : "text-gray-600")}>
          {desc}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Empty state */

export function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-16 text-center">
      <h3 className="font-display text-lg font-bold text-gray-800">{title}</h3>
      {desc && <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ----------------------------------------------------------- Form fields */

export function Field({
  label,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="ml-0.5 text-maroon-600">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

const CONTROL =
  "w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-maroon-600 disabled:bg-gray-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-28 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(CONTROL, "pr-8", className)} {...props} />;
}
