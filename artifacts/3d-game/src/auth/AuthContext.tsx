import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const TOKEN_KEY = "apex-rush-token";
const API_BASE = "/api";

export interface PlayerProfile {
  userId: number;
  username: string;
  level: number;
  xp: number;
  totalRaces: number;
  personalBests: Record<string, number>;
}

interface AuthContextValue {
  token: string | null;
  user: { userId: number; username: string } | null;
  profile: PlayerProfile | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updateProfileAfterRace: (payload: {
    xpGained: number;
    trackId: string;
    bestLapMs: number;
    totalTimeMs: number;
    lapsCompleted: number;
  }) => Promise<PlayerProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function storedToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function saveToken(t: string) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch {}
}
function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(storedToken);
  const [user, setUser] = useState<{ userId: number; username: string } | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authFetch = useCallback(
    async (url: string, opts: RequestInit = {}) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(opts.headers as Record<string, string> ?? {}),
      };
      const tok = storedToken();
      if (tok) headers["Authorization"] = `Bearer ${tok}`;
      return fetch(url, { ...opts, headers });
    },
    []
  );

  const fetchProfile = useCallback(async (tok: string) => {
    const res = await fetch(`${API_BASE}/profile`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as PlayerProfile;
  }, []);

  // On mount: auto-validate stored token
  useEffect(() => {
    const tok = storedToken();
    if (!tok) { setIsLoading(false); return; }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (!res.ok) throw new Error("expired");
        const data = await res.json() as { token: string; userId: number; username: string };
        // Backend refreshes the token on /me — save the fresh one
        saveToken(data.token);
        setToken(data.token);
        setUser({ userId: data.userId, username: data.username });
        const prof = await fetchProfile(data.token);
        setProfile(prof);
      } catch {
        clearToken();
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchProfile]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Login failed" }));
      throw new Error(err.error ?? "Login failed");
    }
    const data = await res.json() as { token: string; userId: number; username: string };
    saveToken(data.token);
    setToken(data.token);
    setUser({ userId: data.userId, username: data.username });
    const prof = await fetchProfile(data.token);
    setProfile(prof);
  }, [fetchProfile]);

  const register = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Registration failed" }));
      throw new Error(err.error ?? "Registration failed");
    }
    const data = await res.json() as { token: string; userId: number; username: string };
    saveToken(data.token);
    setToken(data.token);
    setUser({ userId: data.userId, username: data.username });
    const prof = await fetchProfile(data.token);
    setProfile(prof);
  }, [fetchProfile]);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const tok = storedToken();
    if (!tok) return;
    const prof = await fetchProfile(tok);
    setProfile(prof);
  }, [fetchProfile]);

  const updateProfileAfterRace = useCallback(async (payload: {
    xpGained: number;
    trackId: string;
    bestLapMs: number;
    totalTimeMs: number;
    lapsCompleted: number;
  }): Promise<PlayerProfile | null> => {
    const tok = storedToken();
    if (!tok) return null;
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const updated = await res.json() as PlayerProfile;
      setProfile(updated);
      return updated;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      token, user, profile, isLoading,
      login, register, logout, refreshProfile, updateProfileAfterRace,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
