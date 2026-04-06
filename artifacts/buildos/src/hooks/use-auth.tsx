import { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, getGetMeQueryKey, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("slably_token"));
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading } = useQuery({
    queryKey: getGetMeQueryKey(),
    queryFn: () => getMe(),
    enabled: !!token,
    retry: false,
  });

  const handleLogin = (newToken: string) => {
    localStorage.setItem("slably_token", newToken);
    setToken(newToken);
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };

  const handleLogout = () => {
    localStorage.removeItem("slably_token");
    setToken(null);
    queryClient.clear();
    setLocation("/login");
  };

  useEffect(() => {
    if (token && !isLoading && !user) {
      // Token is invalid or expired
      handleLogout();
    }
  }, [token, user, isLoading]);

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading: isLoading && !!token, login: handleLogin, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
