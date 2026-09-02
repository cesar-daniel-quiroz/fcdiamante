import { useState } from "react";
import { inputCls } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      if (mode === "in") {
        const { error } = await signIn(email.trim(), password);
        if (error) setErr(error);
      } else {
        const { error } = await signUp(email.trim(), password, fullName.trim());
        if (error) setErr(error);
        else setInfo("Cuenta creada. Si se pide confirmación por correo, revísalo y luego inicia sesión.");
      }
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
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {mode === "in" ? "Iniciar sesión" : "Crear cuenta"}
          </h2>

          {mode === "up" && (
            <label className="block mb-3">
              <span className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                Nombre
              </span>
              <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
          )}
          <label className="block mb-3">
            <span className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              Correo
            </span>
            <input
              type="email"
              required
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block mb-4">
            <span className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              Contraseña
            </span>
            <input
              type="password"
              required
              minLength={6}
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {err && <p className="text-red-600 text-sm mb-3">{err}</p>}
          {info && <p className="text-emerald-700 text-sm mb-3">{info}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium py-2.5 rounded-md disabled:opacity-60"
          >
            {busy ? "Procesando…" : mode === "in" ? "Entrar" : "Registrarme"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setErr(null);
              setInfo(null);
            }}
            className="w-full text-center text-xs text-stone-500 hover:text-stone-800 mt-4"
          >
            {mode === "in" ? "¿No tienes cuenta? Crear una" : "Ya tengo cuenta · Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
