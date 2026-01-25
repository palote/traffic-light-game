// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";

import type { User } from "firebase/auth";

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

import { startTeacherSession, endTeacherSession } from "../services/metricsService";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authRequired: boolean;
  isAdmin: boolean;
  adminLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  // Refs para acceder en event listeners
  const userRef = useRef<User | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // Mantener refs sincronizados
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

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
  // Tracking de cierre de pestaña/navegador
  // -----------------------
  useEffect(() => {
    if (!authRequired) return;

    const handleBeforeUnload = () => {
      const uid = userRef.current?.uid;
      const sid = sessionIdRef.current;

      if (uid && sid) {
        // Usar sendBeacon para envío asíncrono confiable
        const url = `https://traffic-ligths-game-default-rtdb.firebaseio.com/metrics/teachers/${uid}/sessions/${sid}.json`;
        const now = Date.now();
        
        // Leer loginAt del sessionStorage para calcular duración
        const loginAtStr = sessionStorage.getItem(`session_loginAt_${sid}`);
        const loginAt = loginAtStr ? parseInt(loginAtStr, 10) : null;
        const durationSec = loginAt ? Math.max(0, Math.floor((now - loginAt) / 1000)) : null;

        const data = JSON.stringify({
          logoutAt: now,
          ...(durationSec !== null ? { durationSec } : {}),
        });

        // sendBeacon es más confiable que fetch en beforeunload
        navigator.sendBeacon(url, data);
      }
    };

    const handleVisibilityChange = () => {
      // Opcional: también trackear cuando la pestaña se oculta por mucho tiempo
      if (document.visibilityState === "hidden") {
        // Guardar timestamp para detectar sesiones abandonadas
        const sid = sessionIdRef.current;
        if (sid) {
          sessionStorage.setItem(`session_lastVisible_${sid}`, Date.now().toString());
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [authRequired]);

  // -----------------------
  // Guardar loginAt en sessionStorage para cálculo de duración
  // -----------------------
  useEffect(() => {
    if (sessionId) {
      // Guardar el momento de inicio para calcular duración en beforeunload
      const now = Date.now();
      sessionStorage.setItem(`session_loginAt_${sessionId}`, now.toString());
    }
  }, [sessionId]);

  // -----------------------
  // Admin flag
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

    try {
      if (user?.uid && sessionId) {
        await endTeacherSession(user.uid, sessionId);
      }
    } catch (e) {
      console.warn("⚠️ metrics endTeacherSession failed:", e);
    }

    // Limpiar sessionStorage
    if (sessionId) {
      sessionStorage.removeItem(`session_loginAt_${sessionId}`);
      sessionStorage.removeItem(`session_lastVisible_${sessionId}`);
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