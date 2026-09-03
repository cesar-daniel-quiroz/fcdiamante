import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { supabaseConfigured } from "./lib/supabase";
import "./index.css";

function SetupNotice() {
  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-body">
      <div className="max-w-md bg-white border border-stone-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-display text-slate-800 mb-2">DIAMANTE FC</h1>
        <p className="text-sm text-slate-600 mb-4">
          La app todavía no está conectada a Supabase.
        </p>
        <ol className="text-sm text-slate-600 list-decimal pl-5 space-y-1">
          <li>Crea un proyecto en Supabase.</li>
          <li>
            Copia <code className="bg-stone-100 px-1 rounded">.env.example</code> a{" "}
            <code className="bg-stone-100 px-1 rounded">.env.local</code>.
          </li>
          <li>
            Pega tu <code className="bg-stone-100 px-1 rounded">VITE_SUPABASE_URL</code> y{" "}
            <code className="bg-stone-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>.
          </li>
          <li>Ejecuta la migración SQL y reinicia el servidor.</li>
        </ol>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {supabaseConfigured ? (
      <AuthProvider>
        <App />
      </AuthProvider>
    ) : (
      <SetupNotice />
    )}
  </React.StrictMode>,
);

// Register the service worker for installable/offline support (prod only).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support is best-effort */
    });
  });
}
