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

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export type Settings = {
  id: string;
  academy_name: string;
  logo_url: string | null;
};
