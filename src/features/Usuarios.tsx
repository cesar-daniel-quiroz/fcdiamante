import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Profile, Role } from "@/lib/types";

export default function Usuarios() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("email");
    if (error) setErr(error.message);
    else setProfiles(data as Profile[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setRole(id: string, role: Role) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) alert("No se pudo actualizar: " + error.message);
    else load();
  }

  return (
    <div>
      <h2 className="text-3xl mb-1 text-slate-800 font-display">USUARIOS</h2>
      <p className="text-stone-500 text-sm mb-6">
        Administradores y entrenadores. Los nuevos se registran en la pantalla de acceso; aquí
        defines su rol.
      </p>

      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {loading ? (
        <p className="text-stone-400 text-sm">Cargando…</p>
      ) : (
        <div className="bg-white rounded-lg border border-stone-200 overflow-hidden max-w-2xl">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-2.5">Nombre</th>
                <th className="text-left px-4 py-2.5">Correo</th>
                <th className="text-left px-4 py-2.5">Rol</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {p.full_name || "—"}
                    {p.id === user?.id && (
                      <span className="ml-2 text-[10px] text-stone-400 uppercase">(tú)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{p.email}</td>
                  <td className="px-4 py-3">
                    {p.id === user?.id ? (
                      <StatusPill status={p.role === "admin" ? "activo" : "pendiente"} />
                    ) : (
                      <select
                        value={p.role}
                        onChange={(e) => setRole(p.id, e.target.value as Role)}
                        className="border border-stone-300 rounded-md px-2 py-1 text-sm"
                      >
                        <option value="admin">admin</option>
                        <option value="coach">coach</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
