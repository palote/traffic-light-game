// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { User } from "firebase/auth"; // ✅ type-only import

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import { auth, database } from "../firebase.config";
import { ref, get } from "firebase/database";

// ✅ Métricas docentes (Realtime DB) — no toca lógica del juego
import { startTeacherSession, endTeacherSession } from "../services/metricsService";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authRequired: boolean;

  // ✅ NUEVO: admin flag (para dashboard /admin/metrics)
  isAdmin: boolean;
  adminLoading: boolean;

  // email/password
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  // social login
  loginWithGoogle: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ✅ Hook cómodo (no rompe nada existente)
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function getAuthRequiredFlag(): boolean {
  return true;
}


function formatFirebaseError(err: unknown): string {
  const anyErr = err as any;
  const code = typeof anyErr?.code === "string" ? anyErr.code : "";
  const msg = typeof anyErr?.message === "string" ? anyErr.message : "";

  if (code && msg) return `${code} — ${msg}`;
  if (msg) return msg;

  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Ocurrió un error desconocido.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authRequired = getAuthRequiredFlag();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Métricas
  const [sessionId, setSessionId] = useState<string | null>(null);

  // ✅ Admin flag
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // -----------------------
  // Auth State
  // -----------------------
  useEffect(() => {
    if (!authRequired) {
      setLoading(false);
      setUser(null);
      setSessionId(null);
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);

      // ✅ Métricas: iniciar sesión
      if (u) {
        try {
          const sid = await startTeacherSession(u);
          setSessionId(sid);
        } catch (e) {
          console.warn("⚠️ metrics startTeacherSession failed:", e);
          setSessionId(null);
        }
      } else {
        setSessionId(null);
      }
    });

    return () => unsub();
  }, [authRequired]);

  // -----------------------
  // Admin flag (aislado)
  // -----------------------
  useEffect(() => {
    let cancelled = false;

    async function loadAdminFlag(uid: string) {
      setAdminLoading(true);
      try {
        const snap = await get(ref(database, `admins/${uid}`));
        const flag = snap.exists() && snap.val() === true;
        if (!cancelled) setIsAdmin(flag);
      } catch (e) {
        console.warn("⚠️ admin flag read failed:", e);
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setAdminLoading(false);
      }
    }

    if (!authRequired) {
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }

    if (user?.uid) {
      loadAdminFlag(user.uid);
    } else {
      setIsAdmin(false);
      setAdminLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [authRequired, user?.uid]);

  // -----------------------
  // Email / Password
  // -----------------------
  const login = async (email: string, password: string) => {
    if (!authRequired) return;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string) => {
    if (!authRequired) return;

    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (e) {
      console.error("❌ Register failed:", e);
      throw new Error(`No se pudo crear la cuenta: ${formatFirebaseError(e)}`);
    }
  };

  const logout = async () => {
    if (!authRequired) return;

    // ✅ Métricas: cerrar sesión antes de salir
    try {
      if (user?.uid && sessionId) {
        await endTeacherSession(user.uid, sessionId);
      }
    } catch (e) {
      console.warn("⚠️ metrics endTeacherSession failed:", e);
    }

    await signOut(auth);
  };

  // -----------------------
  // Google Popup
  // -----------------------
  const loginWithGoogle = async () => {
    if (!authRequired) return;

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error("❌ Google login failed:", e);
      throw new Error(`No se pudo iniciar sesión con Google: ${formatFirebaseError(e)}`);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authRequired,
      isAdmin,
      adminLoading,
      login,
      register,
      logout,
      loginWithGoogle,
    }),
    [user, loading, authRequired, isAdmin, adminLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
