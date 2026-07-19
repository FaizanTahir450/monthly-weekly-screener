type DashboardCardProps = {
  label: string;
  value: string | number;
  hint: string;
  tone?: "green" | "amber" | "blue" | "slate";
};

const tones = {
  green: "text-emerald-300",
  amber: "text-amber-300",
  blue: "text-sky-300",
  slate: "text-slate-100",
};

export function DashboardCard({
  label,
  value,
  hint,
  tone = "slate",
}: DashboardCardProps) {
  return (
    <section className="panel p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={`mt-3 text-3xl font-semibold ${tones[tone]}`}>
        {value}
      </div>
      <div className="mt-3 text-sm leading-5 text-slate-500">{hint}</div>
    </section>
  );
}
