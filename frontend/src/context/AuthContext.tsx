import React, { createContext, useContext, useState } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  login: (userId: string, email: string, name: string) => void;
  logout: () => void;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Rehydrate session from localStorage on app load.
  // The actual auth is handled by the backend (/api/signin).
  // We just persist userId/name/email locally so the UI survives a page refresh.
  React.useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedEmail = localStorage.getItem("userEmail");
    const storedName = localStorage.getItem("userName");

    if (storedUserId && storedEmail) {
      setIsLoggedIn(true);
      setUserId(storedUserId);
      setUserEmail(storedEmail);
      setUserName(storedName);
    }
  }, []);

  const login = (userId: string, email: string, name: string) => {
    setIsLoggedIn(true);
    setUserId(userId);
    setUserEmail(email);
    setUserName(name);

    localStorage.setItem("userId", userId);
    localStorage.setItem("userEmail", email);
    localStorage.setItem("userName", name);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setUserId(null);
    setUserEmail(null);
    setUserName(null);

    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
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
