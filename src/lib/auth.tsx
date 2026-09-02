import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile, Capability, Role } from "./types";
import { usernameToEmail } from "./types";

type CreateUserInput = {
  username: string;
  password: string;
  full_name?: string;
  role?: Role;
  permissions?: Record<string, boolean>;
};

type AuthCtx = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  can: (cap: Capability) => boolean;
  // Accepts a username (coach) or a full email (admin).
  signIn: (userOrEmail: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  createUser: (input: CreateUserInput) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string): Promise<Profile | null> {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    const p = (data as Profile) ?? null;
    // A deactivated account is signed straight back out.
    if (p && p.active === false) {
      await supabase.auth.signOut();
      setProfile(null);
      setSession(null);
      return null;
    }
    setProfile(p);
    return p;
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) await loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthCtx = {
    session,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    can(cap) {
      if (!profile) return false;
      if (profile.role === "admin") return true;
      return profile.permissions?.[cap] === true;
    },
    async signIn(userOrEmail, password) {
      const id = userOrEmail.trim();
      const email = id.includes("@") ? id : usernameToEmail(id);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Supabase returns the same message; make it friendlier in Spanish.
        return { error: "Usuario o contraseña incorrectos." };
      }
      return { error: null };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async createUser(input) {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: input,
      });
      if (error) {
        // Try to surface the function's JSON error message.
        let msg = error.message;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) msg = (await ctx.json()).error ?? msg;
        } catch { /* ignore */ }
        return { error: msg };
      }
      if (data?.error) return { error: data.error };
      return { error: null };
    },
    async refreshProfile() {
      if (session) await loadProfile(session.user.id);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
