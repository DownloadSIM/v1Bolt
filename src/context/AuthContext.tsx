import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-create profile on sign in
  useEffect(() => {
    if (user) {
      supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? "",
        full_name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          "",
      }, { onConflict: "id" }).then(() => {});
    }
  }, [user]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  };

  const signInWithApple = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const deleteAccount = async () => {
    if (!user) return;

    // Record deletion in audit table
    await supabase.from("deleted_accounts").insert({
      user_id: user.id,
      email: user.email ?? "",
    });

    // Delete profile
    await supabase.from("profiles").delete().eq("id", user.id);

    // Delete orders' user_id reference (keep orders for audit but unlink)
    await supabase
      .from("orders")
      .update({ user_id: null })
      .eq("user_id", user.id);

    // Sign out
    await supabase.auth.signOut();

    // Note: Supabase doesn't provide a client-side API to delete auth.users.
    // The actual auth user deletion should be handled via a Supabase Edge Function
    // or the Supabase Admin API. For now, we sign out and clear local state.
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGoogle, signInWithApple, signOut, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
