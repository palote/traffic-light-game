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
import { ref, get, update } from "firebase/database";

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

  // Refs para acceder en event listeners y logout
  const userRef = useRef<User | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const loginAtRef = useRef<number | null>(null);
  
  // Flag para saber si estamos en proceso de logout
  const isLoggingOutRef = useRef(false);

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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);

      // Si estamos haciendo logout, no resetear sessionId
      if (isLoggingOutRef.current) {
        return;
      }

      // Verificar si este usuario es un referido pendiente
      if (user?.email) {
        try {
          const referralsSnap = await get(ref(database, "referrals"));
          
          if (referralsSnap.exists()) {
            const referrals = referralsSnap.val();
            
            for (const [refId, refData] of Object.entries(referrals) as [string, any][]) {
              if (
                refData.referredEmail?.toLowerCase() === user.email.toLowerCase() &&
                refData.status === "pending"
              ) {
                await update(ref(database, `referrals/${refId}`), {
                  status: "registered",
                  registeredUid: user.uid,
                  registeredAt: Date.now(),
                });
                break;
              }
            }
          }
        } catch (error) {
          console.error("Error checking referral status:", error);
        }
      }

      // Lógica de sesiones
      if (user) {
        try {
          const loginAt = Date.now();
          loginAtRef.current = loginAt;
          
          const sid = await startTeacherSession(user);
          setSessionId(sid);
          sessionIdRef.current = sid;
          
          sessionStorage.setItem(`session_loginAt_${sid}`, loginAt.toString());
        } catch (e) {
          console.warn("⚠️ metrics startTeacherSession failed:", e);
          setSessionId(null);
          sessionIdRef.current = null;
          loginAtRef.current = null;
        }
      } else {
        setSessionId(null);
        sessionIdRef.current = null;
        loginAtRef.current = null;
      }
    });

    return () => unsubscribe();
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
        const url = `https://traffic-ligths-game-default-rtdb.firebaseio.com/metrics/teachers/${uid}/sessions/${sid}.json?x-http-method-override=PATCH`;
        const now = Date.now();
        
        let loginAt = loginAtRef.current;
        if (!loginAt) {
          const loginAtStr = sessionStorage.getItem(`session_loginAt_${sid}`);
          loginAt = loginAtStr ? parseInt(loginAtStr, 10) : null;
        }
        
        const durationSec = loginAt ? Math.max(0, Math.floor((now - loginAt) / 1000)) : null;

        const data = JSON.stringify({
          logoutAt: now,
          ...(durationSec !== null ? { durationSec } : {}),
        });

        navigator.sendBeacon(url, data);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
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

  // -----------------------
  // Logout
  // -----------------------
  const logout = async () => {
    if (!authRequired) return;

    // Capturar valores ANTES de cualquier cambio de estado
    const currentUid = userRef.current?.uid;
    const currentSessionId = sessionIdRef.current;

    // Marcar que estamos en proceso de logout
    isLoggingOutRef.current = true;

    // Cerrar la sesión de métricas ANTES de signOut
    if (currentUid && currentSessionId) {
      try {
        await endTeacherSession(currentUid, currentSessionId);
      } catch (e) {
        console.warn("⚠️ metrics endTeacherSession failed:", e);
      }

      // Limpiar sessionStorage
      sessionStorage.removeItem(`session_loginAt_${currentSessionId}`);
      sessionStorage.removeItem(`session_lastVisible_${currentSessionId}`);
    }

    // Limpiar refs
    sessionIdRef.current = null;
    loginAtRef.current = null;
    setSessionId(null);

    // Hacer signOut
    await signOut(auth);

    // Resetear el flag después de un pequeño delay
    setTimeout(() => {
      isLoggingOutRef.current = false;
    }, 100);
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