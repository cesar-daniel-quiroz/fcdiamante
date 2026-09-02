import { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Field, inputCls } from "@/components/ui";
import type { Settings } from "@/lib/types";
import { saveSettings } from "@/lib/db";

// Logos are stored inline as a data URL in the settings row — small and avoids
// a separate storage bucket. Keep uploads reasonably sized.
const MAX_BYTES = 400 * 1024;

export default function Ajustes({
  settings,
  reload,
}: {
  settings: Settings | null;
  reload: () => Promise<void>;
}) {
  const [name, setName] = useState(settings?.academy_name || "DIAMANTE FC");
  const [logo, setLogo] = useState<string | null>(settings?.logo_url ?? null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setMsg("La imagen es muy grande (máx. 400 KB). Usa una versión más pequeña.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
      setMsg(null);
    };
    reader.readAsDataURL(file);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await saveSettings({ academy_name: name.trim() || "DIAMANTE FC", logo_url: logo });
      await reload();
      setMsg("Guardado.");
    } catch (e) {
      setMsg("No se pudo guardar: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md">
      <h2 className="text-3xl mb-1 text-slate-800 font-display">AJUSTES</h2>
      <p className="text-stone-500 text-sm mb-6">Identidad de la academia</p>

      <div className="bg-white rounded-lg border border-stone-200 p-5">
        <Field label="Nombre de la academia">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <span className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
          Logo
        </span>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-emerald-900 flex items-center justify-center overflow-hidden shrink-0">
            {logo ? (
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-emerald-300 text-xs">Sin logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium px-3 py-2 rounded-md cursor-pointer w-fit">
              <Upload size={15} /> Subir imagen
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
            {logo && (
              <button
                onClick={() => setLogo(null)}
                className="flex items-center gap-1.5 text-red-600 hover:text-red-800 text-xs w-fit"
              >
                <Trash2 size={13} /> Quitar logo
              </button>
            )}
          </div>
        </div>
        <p className="text-stone-400 text-xs mt-2">PNG o JPG, máx. 400 KB.</p>

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={save}
            disabled={busy}
            className="px-4 py-2 text-sm bg-emerald-800 hover:bg-emerald-900 text-white rounded-md font-medium disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Guardar cambios"}
          </button>
          {msg && <span className="text-xs text-stone-500">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
