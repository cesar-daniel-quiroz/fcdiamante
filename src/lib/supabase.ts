import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Flag the UI when the app has not been pointed at a Supabase project yet.
export const supabaseConfigured = Boolean(url && anon && !url.includes("YOUR-PROJECT"));

// A stub keeps imports working before credentials are wired; the app shows a
// setup screen instead of calling it.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anon || "placeholder-anon-key",
);
