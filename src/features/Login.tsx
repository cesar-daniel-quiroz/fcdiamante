import { useState } from "react";
import { inputCls } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { signIn } = useAuth();
  const [userOrEmail, setUserOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { error } = await signIn(userOrEmail, password);
      if (error) setErr(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-body">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-block bg-emerald-900 text-emerald-50 rounded-lg px-6 py-4">
            <h1 className="text-3xl tracking-wide font-display">DIAMANTE FC</h1>
            <p className="text-emerald-300 text-[11px] uppercase tracking-widest -mt-1">
              Academia de Béisbol
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-lg border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Iniciar sesión</h2>

          <label className="block mb-3">
            <span className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              Usuario o correo
            </span>
            <input
              required
              autoCapitalize="none"
              className={inputCls}
              value={userOrEmail}
              onChange={(e) => setUserOrEmail(e.target.value)}
            />
          </label>
          <label className="block mb-4">
            <span className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              Contraseña
            </span>
            <input
              type="password"
              required
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {err && <p className="text-red-600 text-sm mb-3">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium py-2.5 rounded-md disabled:opacity-60"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>

          <p className="text-center text-xs text-stone-400 mt-4">
            ¿No tienes acceso? Pídele a un administrador que te cree un usuario.
          </p>
        </form>
      </div>
    </div>
  );
}
