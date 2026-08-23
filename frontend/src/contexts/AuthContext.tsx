import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  setAuthToken,
  getAuthToken,
  setSessionId as setStoredSessionId,
  getSessionId as getStoredSessionId,
  clearAuth,
  onSessionEvicted,
  triggerSessionEviction,
  fetchUserProfile,
  QuotaInfo,
} from "../lib/api";
import GentleEvictionModal from "../components/GentleEvictionModal";

export interface AuthUser {
  id: string;
  phoneNumber?: string | null;
  full_name?: string | null;
  displayName?: string | null;
  role: string;
  avatarUrl?: string | null;
  quota?: QuotaInfo;
  plan?: string;
  credits?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  sessionId: string | null;
  login: (token: string, sessionId: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEvicted: boolean;
  dismissEviction: () => void;
  updateCredits: (credits: number) => void;
  updateUserQuota: (quota: QuotaInfo) => void;
  updateDisplayName: (name: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvicted, setIsEvicted] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const dismissEviction = useCallback(() => {
    setIsEvicted(false);
    clearAuth();
    setTokenState(null);
    setSessionIdState(null);
    localStorage.removeItem("auth_user");
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    clearAuth();
    setTokenState(null);
    setSessionIdState(null);
    localStorage.removeItem("auth_user");
    setUser(null);
    setIsEvicted(false);
  }, []);

  const login = useCallback((newToken: string, newSessionId: string, newUser: AuthUser) => {
    setAuthToken(newToken);
    setStoredSessionId(newSessionId);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
    setTokenState(newToken);
    setSessionIdState(newSessionId);
    setUser(newUser);
    setIsEvicted(false);
  }, []);

  // Initialize from storage on mount & sync backend profile
  useEffect(() => {
    const storedToken = getAuthToken();
    const storedSession = getStoredSessionId();
    const storedUser = localStorage.getItem("auth_user");

    let initialUser: AuthUser | null = null;
    if (storedUser) {
      try {
        initialUser = JSON.parse(storedUser);
      } catch {
        initialUser = null;
      }
    }

    if (storedToken) {
      setTokenState(storedToken);
      setSessionIdState(storedSession);
    }
    setUser(initialUser);
    setIsLoading(false);

    // Sync latest user profile directly from server
    if (storedToken && initialUser) {
      fetchUserProfile()
        .then((resp) => {
          if (resp && resp.profile) {
            setUser((prev) => {
              const current = prev || initialUser;
              if (!current) return null;
              const name = resp.profile.display_name || resp.profile.full_name || current.displayName || current.full_name;
              const updated: AuthUser = {
                ...current,
                id: resp.profile.id || current.id,
                displayName: name,
                full_name: name,
              };
              localStorage.setItem("auth_user", JSON.stringify(updated));
              return updated;
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  // Listen to API 401 SESSION_REVOKED events
  useEffect(() => {
    const cleanup = onSessionEvicted(() => {
      setIsEvicted(true);
    });
    return cleanup;
  }, []);

  // Connect WebSocket to listen for SESSION_REPLACED event
  useEffect(() => {
    if (!token || !sessionId) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(sessionId)}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "SESSION_REPLACED" || data.event === "SESSION_REPLACED") {
            setIsEvicted(true);
            triggerSessionEviction({ message: data.message, replacedBySessionId: data.replacedBySessionId });
          }
        } catch {}
      };

      ws.onerror = () => {
        // Silently handle WS fallback
      };
    } catch {}

    return () => {
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, [token, sessionId, user?.id]);

  const updateCredits = useCallback((credits: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, credits };
      localStorage.setItem("auth_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateUserQuota = useCallback((quota: QuotaInfo) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, quota };
      localStorage.setItem("auth_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateDisplayName = useCallback((name: string) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated: AuthUser = { ...prev, displayName: name, full_name: name };
      localStorage.setItem("auth_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = getAuthToken();
    if (currentToken) {
      try {
        const res = await fetch("/api/v1/auth/me", {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            const u = data.user;
            const updated: AuthUser = {
              id: u.id,
              phoneNumber: u.phoneNumber,
              displayName: u.displayName,
              full_name: u.displayName,
              avatarUrl: u.avatarUrl,
              role: u.role || 'STUDENT',
              plan: u.subscription?.planId || u.subscription?.plan?.id || 'BASIC_MONTHLY',
              quota: {
                textTurnsRemaining: u.quota?.textTurnsRemaining ?? 20,
                voiceMinsRemaining: u.quota?.voiceMinsRemaining ?? 15,
                assistantRemaining: u.quota?.assistantRemaining ?? 10,
                lastResetAt: u.quota?.lastResetAt ?? new Date().toISOString(),
              },
            };
            setUser(updated);
            localStorage.setItem("auth_user", JSON.stringify(updated));
            return;
          }
        }
      } catch (err) {
        console.error("[AuthContext] refreshUser error:", err);
      }
    }

    // Fallback: sync via fetchUserProfile()
    if (currentToken) {
      try {
        const resp = await fetchUserProfile();
        if (resp && resp.profile) {
          setUser((prev) => {
            if (!prev) return null;
            const name = resp.profile.display_name || resp.profile.full_name || prev.displayName || prev.full_name;
            const updated: AuthUser = {
              ...prev,
              displayName: name,
              full_name: name,
            };
            localStorage.setItem("auth_user", JSON.stringify(updated));
            return updated;
          });
        }
      } catch {}
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        sessionId,
        login,
        logout,
        isAuthenticated: !!user,
        isLoading,
        isEvicted,
        dismissEviction,
        updateCredits,
        updateUserQuota,
        updateDisplayName,
        refreshUser,
      }}
    >
      {children}
      <GentleEvictionModal isOpen={isEvicted} onConfirm={dismissEviction} />
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
};

export default AuthContext;
