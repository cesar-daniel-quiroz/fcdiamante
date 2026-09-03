import { useMemo, useState } from "react";
import { Check, X, CheckCheck } from "lucide-react";
import { inputCls } from "@/components/ui";
import { CATEGORIES } from "@/lib/types";
import type { Student, Attendance, Payment, BillingMode } from "@/lib/types";
import { setAttendance, setPaymentStatus, clearAttendanceCharge } from "@/lib/db";
import { periodFor } from "@/lib/periods";

const today = () => new Date().toISOString().slice(0, 10);

export default function Asistencia({
  students,
  attendance,
  payments,
  reload,
  mode,
}: {
  students: Student[];
  attendance: Attendance[];
  payments: Payment[];
  reload: () => Promise<void>;
  mode: BillingMode;
}) {
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [date, setDate] = useState<string>(today());
  const [busy, setBusy] = useState(false);

  const roster = students.filter((s) => s.status === "activo" && s.category === category);
  const dayMap = useMemo(
    () => new Map(attendance.filter((a) => a.date === date).map((a) => [a.student_id, a.present])),
    [attendance, date],
  );

  const period = periodFor(mode, new Date(date + "T00:00:00"));
  const hasCharge = (studentId: string) =>
    payments.some((p) => p.student_id === studentId && p.mode === mode && p.period === period);

  async function mark(student: Student, present: boolean) {
    setBusy(true);
    try {
      await setAttendance(student.id, category, date, present);
      // Presence activates the period charge; unmarking clears an unpaid one.
      if (present) {
        if (!hasCharge(student.id)) {
          await setPaymentStatus({
            studentId: student.id,
            mode,
            period,
            status: "pendiente",
            fromAttendance: true,
          });
        }
      } else {
        await clearAttendanceCharge(student.id, mode, period);
      }
      await reload();
    } catch (e) {
      alert("No se pudo guardar: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function markAllPresent() {
    setBusy(true);
    try {
      for (const s of roster) {
        await setAttendance(s.id, category, date, true);
        if (!hasCharge(s.id)) {
          await setPaymentStatus({
            studentId: s.id,
            mode,
            period,
            status: "pendiente",
            fromAttendance: true,
          });
        }
      }
      await reload();
    } catch (e) {
      alert("No se pudo guardar: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Last 8 recorded dates for this category, with % present.
  const history = useMemo(() => {
    const byDate = new Map<string, { present: number; total: number }>();
    for (const a of attendance) {
      if (a.category !== category) continue;
      const e = byDate.get(a.date) || { present: 0, total: 0 };
      e.total += 1;
      if (a.present) e.present += 1;
      byDate.set(a.date, e);
    }
    return [...byDate.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 8)
      .map(([d, v]) => ({ date: d, pct: v.total ? Math.round((v.present / v.total) * 100) : 0 }));
  }, [attendance, category]);

  return (
    <div>
      <h2 className="text-3xl mb-1 text-slate-800 font-display">ASISTENCIA</h2>
      <p className="text-stone-500 text-sm mb-5">
        Marca la asistencia. Al marcar presente se activa el cobro de la {mode === "weekly" ? "semana" : "mensualidad"}.
      </p>

      <div className="flex flex-wrap gap-3 items-center mb-5">
        <select
          className={`${inputCls} w-auto`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="date"
          className={`${inputCls} w-auto`}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {roster.length > 0 && (
          <button
            onClick={markAllPresent}
            disabled={busy}
            className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium px-3 py-2 rounded-md disabled:opacity-60"
          >
            <CheckCheck size={15} /> Marcar todos
          </button>
        )}
      </div>

      {roster.length === 0 ? (
        <p className="text-stone-400 text-sm">No hay alumnos activos en esta categoría.</p>
      ) : (
        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {roster.map((s) => {
                const val = dayMap.get(s.id);
                return (
                  <tr key={s.id} className="border-t border-stone-100 first:border-t-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => mark(s, true)}
                          disabled={busy}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            val === true
                              ? "bg-emerald-700 text-white border-emerald-700"
                              : "text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          }`}
                        >
                          <Check size={13} /> Presente
                        </button>
                        <button
                          onClick={() => mark(s, false)}
                          disabled={busy}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            val === false
                              ? "bg-red-600 text-white border-red-600"
                              : "text-red-600 border-red-200 hover:bg-red-50"
                          }`}
                        >
                          <X size={13} /> Ausente
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-2">
            Historial reciente · {category}
          </h3>
          <div className="flex flex-wrap gap-2">
            {history.map((h) => (
              <button
                key={h.date}
                onClick={() => setDate(h.date)}
                className="bg-white border border-stone-200 rounded-md px-3 py-2 text-left hover:border-emerald-300"
              >
                <span className="block text-xs text-slate-700">
                  {new Date(h.date + "T00:00:00").toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <span className="block text-[11px] text-emerald-700 font-medium">{h.pct}%</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
