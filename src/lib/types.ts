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
export type PaymentStatus = "pagado" | "pendiente" | "atrasado" | "parcial";
export type PaymentMethod = "efectivo" | "transferencia" | "tarjeta";
export type BillingMode = "weekly" | "monthly";

export const PAYMENT_METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "efectivo", label: "Efectivo" },
  { key: "transferencia", label: "Transferencia" },
  { key: "tarjeta", label: "Tarjeta" },
];

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
  birthdate: string | null;
  photo_url: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  notes: string | null;
};

export type Attendance = {
  id: string;
  student_id: string;
  category: string | null;
  date: string; // yyyy-mm-dd
  present: boolean;
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

// One record per student per billing period. `period` is "YYYY-MM" (monthly) or
// "YYYY-Www" (ISO week). `mode` says which cadence the row belongs to.
export type Payment = {
  id: string;
  student_id: string;
  mode: BillingMode;
  period: string;
  status: PaymentStatus;
  paid_date: string | null;
  method: PaymentMethod | null;
  amount: number | null;
  from_attendance: boolean;
};

export type Role = "admin" | "coach";

// Per-section capabilities a coach can be granted. Admins always have all.
export type Capability = "alumnos" | "asistencia" | "pagos" | "horarios";

export const CAP_LIST: { key: Capability; label: string; coachDefault: boolean }[] = [
  { key: "alumnos", label: "Gestionar alumnos", coachDefault: true },
  { key: "asistencia", label: "Tomar asistencia", coachDefault: true },
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
  billing_mode: BillingMode;
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
