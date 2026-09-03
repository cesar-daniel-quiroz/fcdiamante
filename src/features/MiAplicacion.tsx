import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Clock3,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Undo2,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { AppRequest, AppPortal, RequestStatus } from "@/lib/types";
import {
  fetchPortal,
  fetchRequests,
  createRequest,
  createRevert,
  markRequestSeen,
} from "@/lib/db";

const POLL_MS = 12000;

function portalOpen(portal: AppPortal | null): boolean {
  if (!portal || !portal.enabled) return false;
  if (!portal.access_until) return true;
  return new Date(portal.access_until).getTime() > Date.now();
}

function daysLeft(portal: AppPortal | null): number | null {
  if (!portal?.access_until) return null;
  const ms = new Date(portal.access_until).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

const STATUS: Record<RequestStatus, { label: string; cls: string; icon: typeof Clock3 }> = {
  pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-800", icon: Clock3 },
  en_progreso: { label: "En progreso", cls: "bg-sky-100 text-sky-800", icon: Loader2 },
  completado: { label: "Completado", cls: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  error: { label: "Error", cls: "bg-red-100 text-red-700", icon: AlertTriangle },
  revertido: { label: "Revertido", cls: "bg-stone-200 text-stone-600", icon: Undo2 },
};

export default function MiAplicacion() {
  const { profile } = useAuth();
  const [portal, setPortal] = useState<AppPortal | null>(null);
  const [requests, setRequests] = useState<AppRequest[]>([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prevFinished = useRef<Set<string>>(new Set());
  const [justFinished, setJustFinished] = useState<AppRequest[]>([]);

  const refresh = useCallback(async () => {
    const [p, r] = await Promise.all([fetchPortal(), fetchRequests()]);
    setPortal(p);
    // Detect newly finished requests to notify the admin.
    const finishedNow = r.filter(
      (x) => (x.status === "completado" || x.status === "error") && !x.seen,
    );
    if (prevFinished.current.size > 0) {
      const fresh = finishedNow.filter((x) => !prevFinished.current.has(x.id));
      if (fresh.length) setJustFinished((prev) => [...fresh, ...prev].slice(0, 5));
    }
    prevFinished.current = new Set(finishedNow.map((x) => x.id));
    setRequests(r);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  async function send() {
    if (!prompt.trim() || !profile) return;
    setBusy(true);
    try {
      await createRequest(prompt.trim(), profile.id);
      setPrompt("");
      await refresh();
    } catch (e) {
      alert("No se pudo enviar: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revert(req: AppRequest) {
    if (!profile) return;
    if (!confirm("¿Volver al estado anterior a este cambio? Se creará una petición de reversión."))
      return;
    try {
      await createRevert(req, profile.id);
      await refresh();
    } catch (e) {
      alert("No se pudo revertir: " + (e as Error).message);
    }
  }

  async function dismiss(id: string) {
    await markRequestSeen(id);
    setJustFinished((prev) => prev.filter((x) => x.id !== id));
    prevFinished.current.delete(id);
    refresh();
  }

  const open = portalOpen(portal);
  const left = daysLeft(portal);

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h2 className="text-3xl text-slate-800 font-display">MI APLICACIÓN</h2>
        <button
          onClick={refresh}
          className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800"
        >
          <RotateCcw size={13} /> Actualizar
        </button>
      </div>
      <p className="text-stone-500 text-sm mb-5">
        Pide cambios o funciones nuevas para tu app. Si el equipo no está conectado, tu petición
        queda en espera y se procesa al reconectar.
      </p>

      {/* Notifications for freshly finished requests */}
      {justFinished.map((r) => (
        <div
          key={r.id}
          className={`mb-3 rounded-md px-4 py-3 text-sm flex items-start justify-between gap-3 ${
            r.status === "completado"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <span>
            {r.status === "completado" ? "✓ Listo: " : "✕ Falló: "}
            <b>{r.prompt.slice(0, 80)}</b>
            {r.result_summary ? ` — ${r.result_summary}` : ""}
          </span>
          <button onClick={() => dismiss(r.id)} className="shrink-0 underline text-xs">
            Ok
          </button>
        </div>
      ))}

      {!open ? (
        <div className="bg-white rounded-lg border border-stone-200 p-8 text-center">
          <p className="text-lg font-semibold text-slate-700">No disponible por el momento</p>
          <p className="text-stone-500 text-sm mt-1">
            El periodo de peticiones no está activo. Contacta al equipo para reactivarlo.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-stone-200 p-4 mb-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Ej. Agrega una pestaña de asistencia por categoría…"
              className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 resize-y"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-stone-400">
                {left != null ? `Periodo activo · ${left} día${left === 1 ? "" : "s"} restantes` : "Periodo activo"}
              </span>
              <button
                onClick={send}
                disabled={busy || !prompt.trim()}
                className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-medium px-3.5 py-2 rounded-md disabled:opacity-60"
              >
                <Send size={15} /> {busy ? "Enviando…" : "Enviar petición"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Request cards */}
      {loaded && requests.length === 0 && open && (
        <p className="text-stone-400 text-sm">Aún no has enviado peticiones.</p>
      )}
      <div className="space-y-3">
        {requests.map((r) => {
          const s = STATUS[r.status];
          const Icon = s.icon;
          const canRevert =
            r.kind === "prompt" && r.status === "completado" && !!r.result_sha;
          return (
            <div key={r.id} className="bg-white rounded-lg border border-stone-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="block text-[10px] uppercase tracking-widest text-stone-400 mb-0.5">
                    Tú
                  </span>
                  <p className="text-sm text-slate-800 font-medium">
                    {r.kind === "revert" && <span className="text-stone-400 mr-1">↩</span>}
                    {r.prompt}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${s.cls}`}
                >
                  <Icon size={12} className={r.status === "en_progreso" ? "animate-spin" : ""} />
                  {s.label}
                </span>
              </div>

              <div className="text-xs text-stone-400 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <span>{new Date(r.created_at).toLocaleString("es-MX")}</span>
                {r.status === "pendiente" && <span>En espera de conexión…</span>}
                {r.base_sha && <span>base: {r.base_sha.slice(0, 7)}</span>}
                {r.result_sha && <span>commit: {r.result_sha.slice(0, 7)}</span>}
              </div>

              {r.result_summary && (
                <div className="mt-3 border-t border-stone-100 pt-2">
                  <span className="block text-[10px] uppercase tracking-widest text-emerald-700 mb-0.5">
                    Agente
                  </span>
                  <p className="text-xs text-stone-600 whitespace-pre-wrap">{r.result_summary}</p>
                </div>
              )}
              {r.error && <p className="text-xs text-red-600 mt-2">{r.error}</p>}

              <div className="flex items-center gap-4 mt-3">
                {r.deploy_url && (
                  <a
                    href={r.deploy_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900"
                  >
                    <ExternalLink size={12} /> Ver despliegue
                  </a>
                )}
                {canRevert && (
                  <button
                    onClick={() => revert(r)}
                    className="flex items-center gap-1 text-xs text-stone-500 hover:text-red-700"
                  >
                    <Undo2 size={12} /> Volver al estado anterior
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
