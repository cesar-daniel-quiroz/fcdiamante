import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { StatusPill, inputCls, Modal, Field } from "@/components/ui";
import { MONTHS, PAYMENT_METHODS } from "@/lib/types";
import type {
  Student,
  Payment,
  BillingMode,
  PaymentStatus,
  PaymentMethod,
} from "@/lib/types";
import { setPaymentStatus } from "@/lib/db";
import { periodFor, monthlyLabel, weeklyLabel, feeLabel } from "@/lib/periods";

// Build a wa.me reminder link. Mexican numbers default to +52 if 10 digits.
function whatsappLink(phone: string, text: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.length === 10 ? "52" + digits : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export default function Pagos({
  students,
  payments,
  reload,
  mode,
  academyName,
}: {
  students: Student[];
  payments: Payment[];
  reload: () => Promise<void>;
  mode: BillingMode;
  academyName: string;
}) {
  const now = new Date();
  const [refDate, setRefDate] = useState(new Date());
  const [paying, setPaying] = useState<Student | null>(null);

  const period = periodFor(mode, refDate);
  const label =
    mode === "weekly"
      ? weeklyLabel(refDate)
      : monthlyLabel(refDate.getFullYear(), refDate.getMonth());

  const active = students.filter((s) => s.status === "activo");
  const periodPay = new Map(
    payments.filter((p) => p.mode === mode && p.period === period).map((p) => [p.student_id, p]),
  );

  async function quickStatus(studentId: string, status: PaymentStatus) {
    try {
      await setPaymentStatus({ studentId, mode, period, status });
      await reload();
    } catch (e) {
      alert("No se pudo actualizar el pago: " + (e as Error).message);
    }
  }

  async function confirmPayment(
    student: Student,
    method: PaymentMethod,
    amount: number,
  ) {
    const status: PaymentStatus = amount < student.fee ? "parcial" : "pagado";
    try {
      await setPaymentStatus({ studentId: student.id, mode, period, status, method, amount });
      await reload();
      setPaying(null);
    } catch (e) {
      alert("No se pudo registrar el pago: " + (e as Error).message);
    }
  }

  const totalDue = active.reduce((s, st) => s + st.fee, 0);
  const totalCollected = active.reduce((s, st) => {
    const p = periodPay.get(st.id);
    if (!p || (p.status !== "pagado" && p.status !== "parcial")) return s;
    return s + (p.amount != null ? p.amount : st.fee);
  }, 0);

  function shiftWeek(delta: number) {
    const d = new Date(refDate);
    d.setDate(d.getDate() + delta * 7);
    setRefDate(d);
  }

  return (
    <div>
      <h2 className="text-3xl mb-1 text-slate-800 font-display">PAGOS</h2>

      <div className="flex flex-wrap gap-3 items-center mb-5 mt-3">
        {mode === "weekly" ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftWeek(-1)}
              className="p-1.5 rounded-md border border-stone-300 hover:bg-stone-100"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-slate-700 min-w-[180px] text-center">{label}</span>
            <button
              onClick={() => shiftWeek(1)}
              className="p-1.5 rounded-md border border-stone-300 hover:bg-stone-100"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => setRefDate(new Date())}
              className="text-xs text-stone-500 hover:text-stone-800 underline ml-1"
            >
              Hoy
            </button>
          </div>
        ) : (
          <>
            <select
              className={`${inputCls} w-auto`}
              value={refDate.getMonth()}
              onChange={(e) =>
                setRefDate(new Date(refDate.getFullYear(), Number(e.target.value), 1))
              }
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select
              className={`${inputCls} w-auto`}
              value={refDate.getFullYear()}
              onChange={(e) =>
                setRefDate(new Date(Number(e.target.value), refDate.getMonth(), 1))
              }
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </>
        )}
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
                <th className="text-left px-4 py-2.5">{feeLabel(mode)}</th>
                <th className="text-left px-4 py-2.5">Estado</th>
                <th className="text-right px-4 py-2.5">Acción</th>
              </tr>
            </thead>
            <tbody>
              {active.map((s) => {
                const p = periodPay.get(s.id);
                const status = p?.status || "pendiente";
                const reminder = whatsappLink(
                  s.phone,
                  `Hola, le recordamos el pago de ${academyName}: ${s.name}, ${feeLabel(
                    mode,
                  ).toLowerCase()} $${s.fee} (${label}). ¡Gracias!`,
                );
                return (
                  <tr key={s.id} className="border-t border-stone-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-4 py-3 text-stone-600">
                      ${s.fee}
                      {p?.status === "parcial" && p.amount != null && (
                        <span className="text-amber-700 text-xs ml-1">(pagó ${p.amount})</span>
                      )}
                      {p?.method && (
                        <span className="text-stone-400 text-xs ml-1">· {p.method}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-3 justify-end items-center">
                        {reminder && status !== "pagado" && (
                          <a
                            href={reminder}
                            target="_blank"
                            rel="noreferrer"
                            title="Recordar por WhatsApp"
                            className="text-emerald-600 hover:text-emerald-800"
                          >
                            <MessageCircle size={15} />
                          </a>
                        )}
                        {status === "pagado" || status === "parcial" ? (
                          <button
                            onClick={() => quickStatus(s.id, "pendiente")}
                            className="text-xs text-stone-500 hover:text-stone-800 underline"
                          >
                            Marcar pendiente
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setPaying(s)}
                              className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                            >
                              Registrar pago
                            </button>
                            <button
                              onClick={() => quickStatus(s.id, "atrasado")}
                              className="text-xs font-medium text-red-600 hover:text-red-800"
                            >
                              Atrasado
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paying && (
        <PaymentModal
          student={paying}
          onClose={() => setPaying(null)}
          onConfirm={confirmPayment}
        />
      )}
    </div>
  );
}

function PaymentModal({
  student,
  onClose,
  onConfirm,
}: {
  student: Student;
  onClose: () => void;
  onConfirm: (s: Student, method: PaymentMethod, amount: number) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const [amount, setAmount] = useState<string>(String(student.fee));

  return (
    <Modal title={`Registrar pago · ${student.name}`} onClose={onClose}>
      <Field label="Método de pago">
        <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </Field>
      <Field label={`Monto (cuota $${student.fee})`}>
        <input
          type="number"
          min="0"
          className={inputCls}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      {Number(amount) < student.fee && (
        <p className="text-amber-700 text-xs mb-2">
          Menor a la cuota: se marcará como pago parcial.
        </p>
      )}
      <div className="flex justify-end gap-2 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
        >
          Cancelar
        </button>
        <button
          onClick={() => onConfirm(student, method, Number(amount) || 0)}
          className="px-4 py-2 text-sm bg-emerald-800 hover:bg-emerald-900 text-white rounded-md font-medium"
        >
          Guardar pago
        </button>
      </div>
    </Modal>
  );
}
