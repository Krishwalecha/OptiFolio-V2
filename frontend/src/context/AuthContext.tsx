import React, { createContext, useContext, useState } from "react";
import { clearSession, hasSession, saveSession, Session } from "@/lib/api";

interface AuthContextType {
  isLoggedIn: boolean;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  login: (userId: string, email: string, name: string, session: Session) => void;
  logout: () => void;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Rehydrate session from localStorage on app load.
// The actual auth is handled by the backend (/api/signin).
// We just persist userId/name/email locally so the UI survives a page refresh.
const stored = () => {
  const userId = localStorage.getItem("userId");
  const email = localStorage.getItem("userEmail");
  return userId && email && hasSession()
    ? { userId, email, name: localStorage.getItem("userName") }
    : null;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const initial = stored();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!initial);
  const [userId, setUserId] = useState<string | null>(initial?.userId ?? null);
  const [userEmail, setUserEmail] = useState<string | null>(initial?.email ?? null);
  const [userName, setUserName] = useState<string | null>(initial?.name ?? null);

  const logout = React.useCallback(() => {
    setIsLoggedIn(false);
    setUserId(null);
    setUserEmail(null);
    setUserName(null);

    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    clearSession();
  }, []);

  React.useEffect(() => {
    if (!initial) {
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
    }
    window.addEventListener("auth:expired", logout);
    return () => window.removeEventListener("auth:expired", logout);
  }, [logout]);

  const login = (userId: string, email: string, name: string, session: Session) => {
    saveSession(session);
    setIsLoggedIn(true);
    setUserId(userId);
    setUserEmail(email);
    setUserName(name);

    localStorage.setItem("userId", userId);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userName", name);
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, userId, userEmail, userName, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
