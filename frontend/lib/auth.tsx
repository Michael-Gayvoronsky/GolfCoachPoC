"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { AuthUser } from "./api";

type Ctx = { user: AuthUser | null; setUser: (u: AuthUser | null) => void; signOut: () => void; ready: boolean };
const AuthCtx = createContext<Ctx>({ user: null, setUser: () => {}, signOut: () => {}, ready: false });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) try { setUserState(JSON.parse(raw)); } catch {}
    setReady(true);
  }, []);

  const setUser = (u: AuthUser | null) => {
    setUserState(u);
    if (u) { localStorage.setItem("user", JSON.stringify(u)); localStorage.setItem("token", u.token); }
    else { localStorage.removeItem("user"); localStorage.removeItem("token"); }
  };

  return <AuthCtx.Provider value={{ user, setUser, signOut: () => setUser(null), ready }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
