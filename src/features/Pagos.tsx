import { useState } from "react";
import { StatusPill, inputCls } from "@/components/ui";
import { MONTHS } from "@/lib/types";
import type { Student, Payment, PaymentStatus } from "@/lib/types";
import { upsertPayment } from "@/lib/db";

export default function Pagos({
  students,
  payments,
  reload,
}: {
  students: Student[];
  payments: Payment[];
  reload: () => Promise<void>;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const active = students.filter((s) => s.status === "activo");
  const monthData = new Map(
    payments
      .filter((p) => p.year === year && p.month === month)
      .map((p) => [p.student_id, p.status]),
  );

  async function setStatus(studentId: string, status: PaymentStatus) {
    try {
      await upsertPayment({
        student_id: studentId,
        year,
        month,
        status,
        paid_date: status === "pagado" ? new Date().toISOString().slice(0, 10) : null,
      });
      await reload();
    } catch (e) {
      alert("No se pudo actualizar el pago: " + (e as Error).message);
    }
  }

  const totalDue = active.reduce((s, st) => s + st.fee, 0);
  const totalCollected = active.reduce(
    (s, st) => (monthData.get(st.id) === "pagado" ? s + st.fee : s),
    0,
  );

  return (
    <div>
      <h2 className="text-3xl mb-1 text-slate-800 font-display">PAGOS</h2>
      <div className="flex flex-wrap gap-3 items-center mb-5 mt-3">
        <select
          className={`${inputCls} w-auto`}
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>
        <select
          className={`${inputCls} w-auto`}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        >
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <span className="text-sm text-stone-500 ml-auto">
          Recaudado: <b className="text-emerald-800">${totalCollected}</b> / ${totalDue}
        </span>
      </div>

      {active.length === 0 ? (
        <p className="text-stone-400 text-sm">No hay alumnos activos.</p>
      ) : (
        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Alumno</th>
                <th className="text-left px-4 py-2.5">Cuota</th>
                <th className="text-left px-4 py-2.5">Estado</th>
                <th className="text-right px-4 py-2.5">Acción</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => {
                const status = monthData.get(s.id) || "pendiente";
                return (
                  <tr key={s.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-stone-600">${s.fee}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status === "pagado" ? (
                        <button
                          onClick={() => setStatus(s.id, "pendiente")}
                          className="text-xs text-stone-500 hover:text-stone-800 underline"
                        >
                          Marcar pendiente
                        </button>
                      ) : (
                        <div className="flex gap-3 justify-end">
                          <button
                            onClick={() => setStatus(s.id, "pagado")}
                            className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                          >
                            Marcar pagado
                          </button>
                          <button
                            onClick={() => setStatus(s.id, "atrasado")}
                            className="text-xs font-medium text-red-600 hover:text-red-800"
                          >
                            Atrasado
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
