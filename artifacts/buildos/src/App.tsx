import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import BuilderDashboard from "@/pages/builder/Dashboard";
import ProjectDetails from "@/pages/builder/ProjectDetails";
import Activities from "@/pages/builder/Activities";
import ClientDashboard from "@/pages/client/ClientDashboard";
import Profile from "@/pages/builder/Profile";
import NotFound from "@/pages/not-found";

// Patch fetch to automatically inject the JWT token and handle 401s
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  const token = localStorage.getItem("buildos_token");
  if (token) {
    const newConfig = { ...config };
    // Use new Headers() to correctly handle Headers instances (not plain objects).
    // Spreading a Headers instance with {...headers} loses all entries because
    // Headers stores values internally, not as own enumerable properties.
    const newHeaders = new Headers(newConfig.headers as HeadersInit | undefined);
    newHeaders.set("Authorization", `Bearer ${token}`);
    newConfig.headers = newHeaders;
    const response = await originalFetch(resource, newConfig);
    if (response.status === 401) {
      localStorage.removeItem("buildos_token");
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      window.location.href = `${base}/login?reason=session_expired`;
    }
    return response;
  }
  return originalFetch(resource, config);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

function ProtectedRoute({ component: Component, roleRequired }: { component: any, roleRequired?: 'builder' | 'client' }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-pulse flex items-center gap-2 font-display font-bold text-xl text-primary">Loading Slably...</div></div>;
  if (!user) {
    const currentPath = window.location.pathname + window.location.search;
    return <Redirect to={`/login?next=${encodeURIComponent(currentPath)}`} />;
  }
  if (roleRequired && user.role !== roleRequired) return <Redirect to={user.role === 'builder' ? '/dashboard' : '/client'} />;
  
  return <Component />;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-pulse font-display font-bold text-xl text-primary">Loading...</div></div>;
  if (!user) return <Redirect to="/login" />;
  return <Redirect to={user.role === 'builder' ? '/dashboard' : '/client'} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard"><ProtectedRoute component={BuilderDashboard} roleRequired="builder" /></Route>
      <Route path="/projects/:id"><ProtectedRoute component={ProjectDetails} roleRequired="builder" /></Route>
      <Route path="/activities"><ProtectedRoute component={Activities} roleRequired="builder" /></Route>
      <Route path="/profile"><ProtectedRoute component={Profile} roleRequired="builder" /></Route>
      <Route path="/client"><ProtectedRoute component={ClientDashboard} roleRequired="client" /></Route>
      <Route path="/" component={RootRedirect} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

export default App;
