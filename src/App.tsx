import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  CalendarClock,
  Settings as SettingsIcon,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Student, Schedule, Payment, Settings } from "@/lib/types";
import { fetchStudents, fetchSchedules, fetchPayments, fetchSettings } from "@/lib/db";
import Login from "@/features/Login";
import Dashboard from "@/features/Dashboard";
import Alumnos from "@/features/Alumnos";
import Pagos from "@/features/Pagos";
import Horarios from "@/features/Horarios";
import Usuarios from "@/features/Usuarios";
import Ajustes from "@/features/Ajustes";

type Tab = "dashboard" | "alumnos" | "pagos" | "horarios" | "usuarios" | "ajustes";

export default function App() {
  const { session, loading, isAdmin, profile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm font-body">Cargando academia…</p>
      </div>
    );
  }
  if (!session) return <Login />;

  return <Shell isAdmin={isAdmin} profileName={profile?.full_name || null} signOut={signOut} />;
}

function Shell({
  isAdmin,
  profileName,
  signOut,
}: {
  isAdmin: boolean;
  profileName: string | null;
  signOut: () => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadStudents = useCallback(async () => setStudents(await fetchStudents()), []);
  const reloadSchedules = useCallback(async () => setSchedules(await fetchSchedules()), []);
  const reloadPayments = useCallback(async () => setPayments(await fetchPayments()), []);
  const reloadSettings = useCallback(async () => setSettings(await fetchSettings()), []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          reloadStudents(),
          reloadSchedules(),
          reloadPayments(),
          reloadSettings(),
        ]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoaded(true);
      }
    })();
  }, [reloadStudents, reloadSchedules, reloadPayments, reloadSettings]);

  const nav: { id: Tab; label: string; icon: typeof LayoutDashboard; admin?: boolean }[] = [
    { id: "dashboard", label: "Panel", icon: LayoutDashboard },
    { id: "alumnos", label: "Alumnos", icon: Users },
    { id: "pagos", label: "Pagos", icon: DollarSign },
    { id: "horarios", label: "Horarios", icon: CalendarClock },
    { id: "usuarios", label: "Usuarios", icon: ShieldCheck, admin: true },
    { id: "ajustes", label: "Ajustes", icon: SettingsIcon, admin: true },
  ];
  const visible = nav.filter((n) => !n.admin || isAdmin);

  const academyName = settings?.academy_name || "DIAMANTE FC";

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col md:flex-row font-body">
      {/* Sidebar */}
      <aside className="md:w-56 bg-emerald-900 text-emerald-50 flex md:flex-col shrink-0">
        <div className="px-5 py-5 hidden md:block border-b border-emerald-800">
          {settings?.logo_url ? (
            <div className="flex items-center gap-2">
              <img src={settings.logo_url} alt={academyName} className="h-10 w-10 object-contain" />
              <div>
                <h1 className="text-xl tracking-wide font-display leading-none">{academyName}</h1>
                <p className="text-emerald-300 text-[10px] uppercase tracking-widest">
                  Academia de Béisbol
                </p>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl tracking-wide font-display">{academyName}</h1>
              <p className="text-emerald-300 text-[11px] uppercase tracking-widest -mt-1">
                Academia de Béisbol
              </p>
            </>
          )}
        </div>
        <nav className="flex md:flex-col w-full overflow-x-auto md:overflow-visible">
          {visible.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === id
                  ? "bg-emerald-800 text-white border-l-4 border-amber-400"
                  : "text-emerald-200 hover:bg-emerald-800/60"
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden md:block border-t border-emerald-800 px-5 py-4">
          <p className="text-emerald-300 text-xs truncate mb-2">{profileName || "Sesión activa"}</p>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-emerald-200 hover:text-white text-sm"
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl">
        {error && (
          <div className="mb-4 text-xs bg-red-100 text-red-700 px-3 py-2 rounded-md">
            Error de conexión con la base de datos: {error}
          </div>
        )}
        {!loaded ? (
          <p className="text-stone-400 text-sm">Cargando datos…</p>
        ) : (
          <>
            {tab === "dashboard" && (
              <Dashboard students={students} schedules={schedules} payments={payments} />
            )}
            {tab === "alumnos" && <Alumnos students={students} reload={reloadStudents} />}
            {tab === "pagos" && (
              <Pagos students={students} payments={payments} reload={reloadPayments} />
            )}
            {tab === "horarios" && <Horarios schedules={schedules} reload={reloadSchedules} />}
            {tab === "usuarios" && isAdmin && <Usuarios />}
            {tab === "ajustes" && isAdmin && <Ajustes settings={settings} reload={reloadSettings} />}
          </>
        )}
        {/* Mobile sign-out */}
        <button
          onClick={signOut}
          className="md:hidden mt-8 flex items-center gap-1.5 text-stone-500 hover:text-stone-800 text-sm"
        >
          <LogOut size={15} /> Cerrar sesión
        </button>
      </main>
    </div>
  );
}
