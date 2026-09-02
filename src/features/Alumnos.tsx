import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { Modal, Field, StatusPill, inputCls } from "@/components/ui";
import { CATEGORIES } from "@/lib/types";
import type { Student } from "@/lib/types";
import { insertStudent, updateStudent, deleteStudent } from "@/lib/db";

export default function Alumnos({
  students,
  reload,
}: {
  students: Student[];
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Student | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.category.toLowerCase().includes(query.toLowerCase()),
  );

  async function save(data: Student | Omit<Student, "id">) {
    setBusy(true);
    try {
      if ("id" in data && data.id) await updateStudent(data as Student);
      else await insertStudent(data as Omit<Student, "id">);
      await reload();
      setEditing(null);
    } catch (e) {
      alert("No se pudo guardar: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este alumno?")) return;
    try {
      await deleteStudent(id);
      await reload();
    } catch (e) {
      alert("No se pudo eliminar: " + (e as Error).message);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-3xl text-slate-800 font-display">ALUMNOS</h2>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium px-3.5 py-2 rounded-md"
        >
          <Plus size={16} /> Nuevo alumno
        </button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o categoría"
          className={`${inputCls} pl-8`}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-stone-400 text-sm">Ningún alumno coincide con la búsqueda.</p>
      ) : (
        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Nombre</th>
                <th className="text-left px-4 py-2.5 hidden sm:table-cell">Categoría</th>
                <th className="text-left px-4 py-2.5 hidden md:table-cell">Padre/Madre</th>
                <th className="text-left px-4 py-2.5">Cuota</th>
                <th className="text-left px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {s.name}
                    <div className="text-stone-400 text-xs sm:hidden">{s.category}</div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-stone-600">{s.category}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-stone-600">{s.parent}</td>
                  <td className="px-4 py-3 text-stone-600">${s.fee}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditing(s)}
                        className="text-stone-400 hover:text-emerald-800"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => remove(s.id)}
                        className="text-stone-400 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <StudentForm
          initial={editing === "new" ? null : editing}
          busy={busy}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function StudentForm({
  initial,
  busy,
  onClose,
  onSave,
}: {
  initial: Student | null;
  busy: boolean;
  onClose: () => void;
  onSave: (data: Student | Omit<Student, "id">) => void;
}) {
  const [form, setForm] = useState(
    initial || {
      name: "",
      age: "" as number | string,
      category: CATEGORIES[0] as string,
      parent: "",
      phone: "",
      fee: "" as number | string,
      status: "activo" as Student["status"],
      joined: new Date().toISOString().slice(0, 10),
    },
  );

  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      ...form,
      age: Number(form.age) || 0,
      fee: Number(form.fee) || 0,
    } as Student | Omit<Student, "id">);
  }

  return (
    <Modal title={initial ? "Editar alumno" : "Nuevo alumno"} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Nombre completo">
          <input required className={inputCls} value={form.name} onChange={set("name")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Edad">
            <input type="number" min="3" className={inputCls} value={form.age} onChange={set("age")} />
          </Field>
          <Field label="Categoría">
            <select className={inputCls} value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Padre / Madre / Tutor">
          <input className={inputCls} value={form.parent} onChange={set("parent")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <input className={inputCls} value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Cuota mensual ($)">
            <input type="number" min="0" className={inputCls} value={form.fee} onChange={set("fee")} />
          </Field>
        </div>
        <Field label="Estado">
          <select className={inputCls} value={form.status} onChange={set("status")}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
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
