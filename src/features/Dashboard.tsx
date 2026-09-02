import { ScoreDigit } from "@/components/ui";
import { MONTHS, DAYS } from "@/lib/types";
import type { Student, Schedule, Payment } from "@/lib/types";

export default function Dashboard({
  students,
  schedules,
  payments,
}: {
  students: Student[];
  schedules: Schedule[];
  payments: Payment[];
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = `${MONTHS[month]} ${year}`;

  const active = students.filter((s) => s.status === "activo");
  const monthPay = new Map(
    payments
      .filter((p) => p.year === year && p.month === month)
      .map((p) => [p.student_id, p.status]),
  );

  const income = active.reduce(
    (sum, s) => (monthPay.get(s.id) === "pagado" ? sum + s.fee : sum),
    0,
  );
  const pendingCount = active.filter(
    (s) => (monthPay.get(s.id) || "pendiente") !== "pagado",
  ).length;

  const todayIdx = (now.getDay() + 6) % 7; // Monday = 0
  let nextPractice: (Schedule & { day: string }) | null = null;
  for (let offset = 0; offset < 8 && !nextPractice; offset++) {
    const dayName = DAYS[(todayIdx + offset) % 7];
    const matches = schedules
      .filter((sc) => sc.day === dayName)
      .sort((a, b) => a.start.localeCompare(b.start));
    if (matches.length) nextPractice = { ...matches[0], day: dayName };
  }

  return (
    <div>
      <h2 className="text-3xl mb-1 text-slate-800 font-display">PANEL DE CONTROL</h2>
      <p className="text-stone-500 text-sm mb-6">{monthLabel}</p>

      <div className="bg-slate-900 rounded-lg flex flex-wrap justify-center md:justify-start divide-x divide-slate-700 shadow-lg mb-8 overflow-hidden">
        <ScoreDigit label="Alumnos activos" value={active.length} />
        <ScoreDigit label="Ingresos del mes" value={`$${income}`} accent="text-emerald-400" />
        <ScoreDigit label="Pagos pendientes" value={pendingCount} accent="text-amber-400" />
        <ScoreDigit label="Total registrados" value={students.length} accent="text-stone-300" />
      </div>

      <div className="bg-white rounded-lg border border-stone-200 p-5 max-w-md">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
          Próxima práctica
        </h3>
        {nextPractice ? (
          <div>
            <p className="text-slate-800 font-semibold">
              {nextPractice.day} · {nextPractice.start} – {nextPractice.end}
            </p>
            <p className="text-stone-500 text-sm mt-1">
              {nextPractice.category} · {nextPractice.coach} · {nextPractice.field}
            </p>
          </div>
        ) : (
          <p className="text-stone-400 text-sm">No hay horarios registrados todavía.</p>
        )}
      </div>
    </div>
  );
}
