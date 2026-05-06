import { Check, AlertTriangle, AlertOctagon } from "lucide-react";

export type FlagKind = "green" | "yellow" | "red";

const styles: Record<FlagKind, string> = {
  green: "bg-flag-green-soft text-flag-green border-flag-green/40",
  yellow: "bg-flag-yellow-soft text-flag-yellow border-flag-yellow/40",
  red: "bg-flag-red-soft text-flag-red border-flag-red/40",
};

const Icon = {
  green: Check,
  yellow: AlertTriangle,
  red: AlertOctagon,
};

export function flagKindFromLabel(label: string): FlagKind {
  const l = label.toLowerCase();
  if (l.includes("green") || l.includes("rohel") || l.includes("verde") || l.includes("vert") || l.includes("grün") || l.includes("зелен")) return "green";
  if (l.includes("red") || l.includes("punan") || l.includes("rojo") || l.includes("rouge") || l.includes("rot") || l.includes("красн")) return "red";
  return "yellow";
}

function normalizeFlagLabel(label: string, kind: FlagKind): string {
  // Unify Estonian terminology: always "lipp", never "signaal" / "märk".
  const lower = label.toLowerCase();
  const isEstonian = /rohel|kollan|punan|signaal|lipp|märk/.test(lower);
  if (isEstonian) {
    if (kind === "green") return "Roheline lipp";
    if (kind === "red") return "Punane lipp";
    return "Kollane lipp";
  }
  // English: normalize "Mixed signals" / "Yellow signal" → "Yellow flag"
  if (/signal|sign\b/i.test(label)) {
    if (kind === "green") return "Green flag";
    if (kind === "red") return "Red flag";
    return "Yellow flag";
  }
  return label;
}

export function FlagBadge({
  label,
  kind,
  size = "md",
}: {
  label: string;
  kind?: FlagKind;
  size?: "sm" | "md" | "lg";
}) {
  const k = kind ?? flagKindFromLabel(label);
  const I = Icon[k];
  const text = normalizeFlagLabel(label, k);
  const sizing =
    size === "lg"
      ? "px-5 py-2 text-base"
      : size === "sm"
        ? "px-3 py-1 text-xs"
        : "px-4 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${sizing} font-medium shadow-sm ${styles[k]}`}
    >
      <I className={size === "lg" ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={2.5} />
      {text}
    </span>
  );
}
