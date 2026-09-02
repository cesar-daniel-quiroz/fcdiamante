import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Modal, Field, inputCls } from "@/components/ui";
import { CATEGORIES, DAYS } from "@/lib/types";
import type { Schedule } from "@/lib/types";
import { insertSchedule, updateSchedule, deleteSchedule } from "@/lib/db";

export default function Horarios({
  schedules,
  reload,
}: {
  schedules: Schedule[];
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Schedule | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(data: Schedule | Omit<Schedule, "id">) {
    setBusy(true);
    try {
      if ("id" in data && data.id) await updateSchedule(data as Schedule);
      else await insertSchedule(data as Omit<Schedule, "id">);
      await reload();
      setEditing(null);
    } catch (e) {
      alert("No se pudo guardar: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta práctica?")) return;
    try {
      await deleteSchedule(id);
      await reload();
    } catch (e) {
      alert("No se pudo eliminar: " + (e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-3xl text-slate-800 font-display">HORARIOS</h2>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium px-3.5 py-2 rounded-md"
        >
          <Plus size={16} /> Nueva práctica
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {DAYS.filter((d) => schedules.some((s) => s.day === d)).map((day) => (
          <div key={day} className="bg-white rounded-lg border border-stone-200 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-800 mb-2">
              {day}
            </h3>
            <div className="space-y-2">
              {schedules
                .filter((s) => s.day === day)
                .sort((a, b) => a.start.localeCompare(b.start))
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between border-t border-stone-100 pt-2 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {s.start} – {s.end} · {s.category}
                      </p>
                      <p className="text-xs text-stone-500">{s.coach} · {s.field}</p>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-2">
                      <button
                        onClick={() => setEditing(s)}
                        className="text-stone-400 hover:text-emerald-800"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => remove(s.id)}
                        className="text-stone-400 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="text-stone-400 text-sm">No hay prácticas registradas.</p>
        )}
      </div>

      {editing && (
        <ScheduleForm
          initial={editing === "new" ? null : editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function ScheduleForm({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: Schedule | null;
  busy: boolean;
  onClose: () => void;
  onSave: (data: Schedule | Omit<Schedule, "id">) => void;
}) {
  const [form, setForm] = useState(
    initial || {
      day: DAYS[0] as string,
      start: "16:00",
      end: "17:30",
      category: CATEGORIES[0] as string,
      coach: "",
      field: "",
    },
  );

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form as Schedule | Omit<Schedule, "id">);
  }

  return (
    <Modal title={initial ? "Editar práctica" : "Nueva práctica"} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Día">
          <select className={inputCls} value={form.day} onChange={set("day")}>
            {DAYS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hora inicio">
            <input type="time" className={inputCls} value={form.start} onChange={set("start")} />
          </Field>
          <Field label="Hora fin">
            <input type="time" className={inputCls} value={form.end} onChange={set("end")} />
          </Field>
        </div>
        <Field label="Categoría">
          <select className={inputCls} value={form.category} onChange={set("category")}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Entrenador">
          <input className={inputCls} value={form.coach} onChange={set("coach")} />
        </Field>
        <Field label="Cancha / Diamante">
          <input className={inputCls} value={form.field} onChange={set("field")} />
        </Field>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 text-sm bg-emerald-800 hover:bg-emerald-900 text-white rounded-md font-medium disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
