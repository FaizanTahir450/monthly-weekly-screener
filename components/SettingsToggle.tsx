"use client";

type SettingsToggleProps = {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export function SettingsToggle({
  label,
  description,
  enabled,
  onChange,
}: SettingsToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-muted/60 p-4">
      <div>
        <div className="font-medium text-white">{label}</div>
        <div className="mt-1 text-sm leading-5 text-slate-400">
          {description}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          enabled
            ? "border-emerald-400 bg-emerald-500"
            : "border-slate-600 bg-slate-800"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
