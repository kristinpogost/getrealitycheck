type FlagKind = "green" | "yellow" | "red";

const styles: Record<FlagKind, string> = {
  green: "bg-flag-green-soft text-flag-green border-flag-green/30",
  yellow: "bg-flag-yellow-soft text-flag-yellow border-flag-yellow/30",
  red: "bg-flag-red-soft text-flag-red border-flag-red/30",
};

const dotStyles: Record<FlagKind, string> = {
  green: "bg-flag-green",
  yellow: "bg-flag-yellow",
  red: "bg-flag-red",
};

export function flagKind(label: string): FlagKind {
  const l = label.toLowerCase();
  if (l.includes("green") || l.includes("rohel")) return "green";
  if (l.includes("red") || l.includes("punan")) return "red";
  return "yellow";
}

export function FlagBadge({ label }: { label: string }) {
  const k = flagKind(label);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium ${styles[k]}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dotStyles[k]} animate-pulse`} />
      {label}
    </span>
  );
}
