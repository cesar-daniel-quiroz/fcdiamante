import { supabase } from "./supabase";
import type {
  Student,
  Schedule,
  Payment,
  Settings,
  Attendance,
  BillingMode,
  PaymentStatus,
  PaymentMethod,
  AppRequest,
  AppPortal,
} from "./types";

// ---------- Students ----------
export async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("name");
  if (error) throw error;
  return data as Student[];
}

export async function insertStudent(s: Omit<Student, "id">): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .insert(s)
    .select()
    .single();
  if (error) throw error;
  return data as Student;
}

export async function updateStudent(s: Student): Promise<Student> {
  const { id, ...rest } = s;
  const { data, error } = await supabase
    .from("students")
    .update(rest)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Student;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Schedules ----------
export async function fetchSchedules(): Promise<Schedule[]> {
  const { data, error } = await supabase.from("schedules").select("*");
  if (error) throw error;
  return data as Schedule[];
}

export async function insertSchedule(s: Omit<Schedule, "id">): Promise<Schedule> {
  const { data, error } = await supabase
    .from("schedules")
    .insert(s)
    .select()
    .single();
  if (error) throw error;
  return data as Schedule;
}

export async function updateSchedule(s: Schedule): Promise<Schedule> {
  const { id, ...rest } = s;
  const { data, error } = await supabase
    .from("schedules")
    .update(rest)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Schedule;
}

export async function deleteSchedule(id: string): Promise<void> {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Payments ----------
export async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await supabase.from("payments").select("*");
  if (error) throw error;
  return data as Payment[];
}

// Set (or clear) a student's charge status for a billing period.
export async function setPaymentStatus(args: {
  studentId: string;
  mode: BillingMode;
  period: string;
  status: PaymentStatus;
  method?: PaymentMethod | null;
  amount?: number | null;
  fromAttendance?: boolean;
}): Promise<Payment> {
  const paid = args.status === "pagado" || args.status === "parcial";
  const row = {
    student_id: args.studentId,
    mode: args.mode,
    period: args.period,
    status: args.status,
    paid_date: paid ? new Date().toISOString().slice(0, 10) : null,
    method: paid ? args.method ?? null : null,
    amount: paid ? args.amount ?? null : null,
    from_attendance: args.fromAttendance ?? false,
  };
  const { data, error } = await supabase
    .from("payments")
    .upsert(row, { onConflict: "student_id,mode,period" })
    .select()
    .single();
  if (error) throw error;
  return data as Payment;
}

// Remove an unpaid, attendance-activated charge (used when unmarking presence).
export async function clearAttendanceCharge(
  studentId: string,
  mode: BillingMode,
  period: string,
): Promise<void> {
  await supabase
    .from("payments")
    .delete()
    .eq("student_id", studentId)
    .eq("mode", mode)
    .eq("period", period)
    .eq("from_attendance", true)
    .in("status", ["pendiente", "atrasado"]);
}

// ---------- Attendance ----------
export async function fetchAttendance(): Promise<Attendance[]> {
  const { data, error } = await supabase.from("attendance").select("*");
  if (error) throw error;
  return data as Attendance[];
}

export async function setAttendance(
  studentId: string,
  category: string,
  date: string,
  present: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("attendance")
    .upsert(
      { student_id: studentId, category, date, present },
      { onConflict: "student_id,date" },
    );
  if (error) throw error;
}

// ---------- Photo upload (Supabase Storage) ----------
export async function uploadStudentPhoto(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("student-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("student-photos").getPublicUrl(path);
  return data.publicUrl;
}

// ---------- Settings ----------
export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from("settings")
    .select("*")
    .eq("id", "academy")
    .maybeSingle();
  if (error) throw error;
  return (data as Settings) ?? null;
}

export async function saveSettings(
  patch: Partial<Omit<Settings, "id">>,
): Promise<Settings> {
  const { data, error } = await supabase
    .from("settings")
    .upsert({ id: "academy", ...patch })
    .select()
    .single();
  if (error) throw error;
  return data as Settings;
}

// ---------- Portal (Mi Aplicación) ----------
export async function fetchPortal(): Promise<AppPortal | null> {
  const { data, error } = await supabase
    .from("app_portal")
    .select("*")
    .eq("id", "portal")
    .maybeSingle();
  if (error) throw error;
  return (data as AppPortal) ?? null;
}

export async function fetchRequests(): Promise<AppRequest[]> {
  const { data, error } = await supabase
    .from("app_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as AppRequest[];
}

export async function createRequest(prompt: string, userId: string): Promise<AppRequest> {
  const { data, error } = await supabase
    .from("app_requests")
    .insert({ kind: "prompt", prompt, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as AppRequest;
}

// Queue a rollback to the state before `req` was applied.
export async function createRevert(req: AppRequest, userId: string): Promise<AppRequest> {
  const { data, error } = await supabase
    .from("app_requests")
    .insert({
      kind: "revert",
      prompt: `Revertir al estado anterior a: ${req.prompt.slice(0, 80)}`,
      revert_of: req.id,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data as AppRequest;
}

export async function markRequestSeen(id: string): Promise<void> {
  await supabase.from("app_requests").update({ seen: true }).eq("id", id);
}
