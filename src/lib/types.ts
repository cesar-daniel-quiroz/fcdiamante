export const CATEGORIES = [
  "Tee-Ball",
  "Pitcheo Coach",
  "Kid Pitch",
  "Juvenil",
  "Adulto",
] as const;

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
] as const;

export const DAYS = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
] as const;

export type StudentStatus = "activo" | "inactivo";
export type PaymentStatus = "pagado" | "pendiente" | "atrasado";

export type Student = {
  id: string;
  name: string;
  age: number;
  category: string;
  parent: string;
  phone: string;
  fee: number;
  status: StudentStatus;
  joined: string; // yyyy-mm-dd
};

export type Schedule = {
  id: string;
  day: string;
  start: string; // HH:mm
  end: string;
  category: string;
  coach: string;
  field: string;
};

// One record per student per month. Keyed in-app by `${year}-${month}` (month 0-11).
export type Payment = {
  id: string;
  student_id: string;
  year: number;
  month: number; // 0-11
  status: PaymentStatus;
  paid_date: string | null;
};

export type Role = "admin" | "coach";

// Per-section capabilities a coach can be granted. Admins always have all.
export type Capability = "alumnos" | "pagos" | "horarios";

export const CAP_LIST: { key: Capability; label: string; coachDefault: boolean }[] = [
  { key: "alumnos", label: "Gestionar alumnos", coachDefault: true },
  { key: "horarios", label: "Gestionar horarios", coachDefault: true },
  { key: "pagos", label: "Gestionar pagos", coachDefault: false },
];

export const emptyPerms = (): Record<string, boolean> =>
  Object.fromEntries(CAP_LIST.map((c) => [c.key, c.coachDefault]));

// Coaches log in with just a username; this is the deterministic internal email
// the app maps it to. Never receives real mail.
export const COACH_EMAIL_DOMAIN = "fcdiamante.app";
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${COACH_EMAIL_DOMAIN}`;

export type Profile = {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  role: Role;
  permissions: Record<string, boolean>;
  active: boolean;
};

export type Settings = {
  id: string;
  academy_name: string;
  logo_url: string | null;
};

export type RequestStatus =
  | "pendiente"
  | "en_progreso"
  | "completado"
  | "error"
  | "revertido";

export type AppRequest = {
  id: string;
  kind: "prompt" | "revert";
  prompt: string;
  status: RequestStatus;
  revert_of: string | null;
  created_by: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  base_sha: string | null;
  result_sha: string | null;
  deploy_url: string | null;
  result_summary: string | null;
  error: string | null;
  seen: boolean;
};

export type AppPortal = {
  id: string;
  enabled: boolean;
  access_until: string | null;
  updated_at: string;
};
