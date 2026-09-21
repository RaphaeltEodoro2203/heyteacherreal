const COLORS: Record<string, string> = {
  Speaking: "#D64550",
  Listening: "#AEDFF7",
  Reading: "#B7E4C7",
  Writing: "#8B7FD6"
};

export function SkillBar({ label, percent }: { label: string; percent: number }) {
  const color = COLORS[label] ?? "#8B7FD6";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-brand-ink/70">{label}</span>
        <span className="font-medium text-brand-ink">{Math.round(percent)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-brand-ink/10">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
