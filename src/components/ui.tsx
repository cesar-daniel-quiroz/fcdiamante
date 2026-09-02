import { X, CheckCircle2, Clock3, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export const inputCls =
  "w-full border border-stone-300 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700";

export function ScoreDigit({
  label,
  value,
  accent = "text-amber-400",
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-3 border-r border-slate-700 last:border-r-0 min-w-[130px]">
      <span className={`${accent} text-4xl font-bold tabular-nums leading-none font-mono`}>
        {value}
      </span>
      <span className="text-slate-400 text-[11px] tracking-widest uppercase mt-2 text-center">
        {label}
      </span>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    activo: "bg-emerald-100 text-emerald-800",
    inactivo: "bg-stone-200 text-stone-600",
    pagado: "bg-emerald-100 text-emerald-800",
    pendiente: "bg-amber-100 text-amber-800",
    atrasado: "bg-red-100 text-red-700",
  };
  const icon: Record<string, ReactNode> = {
    pagado: <CheckCircle2 size={13} />,
    pendiente: <Clock3 size={13} />,
    atrasado: <AlertTriangle size={13} />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] || "bg-stone-200 text-stone-700"
      }`}
    >
      {icon[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50">
      <div className="bg-stone-50 rounded-lg w-full max-w-md shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-white rounded-t-lg sticky top-0">
          <h3 className="font-semibold text-slate-800 font-body">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
