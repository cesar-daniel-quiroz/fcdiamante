import { useEffect, useState } from "react";
import { Plus, ShieldCheck, User as UserIcon } from "lucide-react";
import { Modal, Field, inputCls } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { CAP_LIST, emptyPerms } from "@/lib/types";
import type { Profile, Role } from "@/lib/types";

export default function Usuarios() {
  const { profile, createUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("username");
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

  async function setActive(id: string, active: boolean) {
    const { error } = await supabase.from("profiles").update({ active }).eq("id", id);
    if (error) alert("No se pudo actualizar: " + error.message);
    else load();
  }

  async function setPerm(p: Profile, key: string, value: boolean) {
    const permissions = { ...(p.permissions || {}), [key]: value };
    const { error } = await supabase.from("profiles").update({ permissions }).eq("id", p.id);
    if (error) alert("No se pudo actualizar: " + error.message);
    else load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-3xl text-slate-800 font-display">USUARIOS</h2>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium px-3.5 py-2 rounded-md"
        >
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>
      <p className="text-stone-500 text-sm mb-5">
        Crea entrenadores con solo un usuario y contraseña. Asigna rol y permisos por sección.
      </p>

      {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
      {loading ? (
        <p className="text-stone-400 text-sm">Cargando…</p>
      ) : (
        <div className="space-y-3">
          {profiles.map((p) => {
            const isMe = p.id === profile?.id;
            return (
              <div key={p.id} className="bg-white rounded-lg border border-stone-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {p.role === "admin" ? (
                      <ShieldCheck size={18} className="text-emerald-800" />
                    ) : (
                      <UserIcon size={18} className="text-stone-400" />
                    )}
                    <div>
                      <p className="font-medium text-slate-800">
                        {p.full_name || p.username || p.email}
                        {isMe && (
                          <span className="ml-2 text-[10px] text-stone-400 uppercase">(tú)</span>
                        )}
                      </p>
                      <p className="text-xs text-stone-500">
                        {p.username ? `@${p.username}` : p.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isMe ? (
                      <span className="text-xs text-stone-400 uppercase">admin</span>
                    ) : (
                      <>
                        <select
                          value={p.role}
                          onChange={(e) => setRole(p.id, e.target.value as Role)}
                          className="border border-stone-300 rounded-md px-2 py-1 text-sm"
                        >
                          <option value="admin">admin</option>
                          <option value="coach">coach</option>
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-stone-600">
                          <input
                            type="checkbox"
                            checked={p.active}
                            onChange={(e) => setActive(p.id, e.target.checked)}
                          />
                          Activo
                        </label>
                      </>
                    )}
                  </div>
                </div>

                {/* Per-section permissions only matter for coaches */}
                {!isMe && p.role === "coach" && (
                  <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-stone-100">
                    {CAP_LIST.map((c) => (
                      <label key={c.key} className="flex items-center gap-1.5 text-xs text-stone-600">
                        <input
                          type="checkbox"
                          checked={p.permissions?.[c.key] === true}
                          onChange={(e) => setPerm(p, c.key, e.target.checked)}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {creating && (
        <CreateUserForm
          onClose={() => setCreating(false)}
          onCreate={createUser}
          onDone={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CreateUserForm({
  onClose,
  onCreate,
  onDone,
}: {
  onClose: () => void;
  onCreate: ReturnType<typeof useAuth>["createUser"];
  onDone: () => void;
}) {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("coach");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(emptyPerms());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await onCreate({
      username: username.trim().toLowerCase(),
      password,
      full_name: fullName.trim(),
      role,
      permissions: role === "admin" ? {} : permissions,
    });
    setBusy(false);
    if (error) setErr(error);
    else onDone();
  }

  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Usuario (sin espacios)">
          <input
            required
            autoCapitalize="none"
            className={inputCls}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ej. coach.nunez"
          />
        </Field>
        <Field label="Nombre completo">
          <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Contraseña (mín. 6)">
          <input
            type="text"
            required
            minLength={6}
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Rol">
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="coach">Entrenador (coach)</option>
            <option value="admin">Administrador (admin)</option>
          </select>
        </Field>

        {role === "coach" && (
          <div className="mb-3">
            <span className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
              Permisos
            </span>
            <div className="flex flex-col gap-2">
              {CAP_LIST.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={permissions[c.key] === true}
                    onChange={(e) =>
                      setPermissions((prev) => ({ ...prev, [c.key]: e.target.checked }))
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
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
            {busy ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
