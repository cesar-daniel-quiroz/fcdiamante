import { supabase } from "./supabase";
import type {
  Student,
  Schedule,
  Payment,
  Settings,
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

// Upsert on the (student_id, year, month) unique key.
export async function upsertPayment(
  p: Omit<Payment, "id">,
): Promise<Payment> {
  const { data, error } = await supabase
    .from("payments")
    .upsert(p, { onConflict: "student_id,year,month" })
    .select()
    .single();
  if (error) throw error;
  return data as Payment;
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
