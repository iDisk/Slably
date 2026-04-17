import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import BuilderDashboard from "@/pages/builder/Dashboard";
import ProjectDetails from "@/pages/builder/ProjectDetails";
import Activities from "@/pages/builder/Activities";
import Network from "@/pages/builder/Network";
import ClientDashboard from "@/pages/client/ClientDashboard";
import PostJob from "@/pages/client/PostJob";
import Profile from "@/pages/builder/Profile";
import SubProfile from "@/pages/SubProfile";
import BuilderProfile from "@/pages/BuilderProfile";
import Find from "@/pages/Find";
import NotFound from "@/pages/not-found";
import InvitePage from "@/pages/InvitePage";
import ClientProjectView from "@/pages/ClientProjectView";
import AdminPanel from "@/pages/AdminPanel";
import SubDashboard from "@/pages/SubDashboard";
import SubWorkDetail from "@/pages/SubWorkDetail";
import QuotesList from "@/pages/quotes/QuotesList";
import NewQuote from "@/pages/quotes/NewQuote";
import QuoteDetail from "@/pages/quotes/QuoteDetail";
import TaxProDashboard from "@/pages/taxPro/TaxProDashboard";
import CalendarPage from "@/pages/builder/CalendarPage";
import Marketplace from "@/pages/Marketplace";

// Patch fetch to automatically inject the JWT token and handle 401s
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  const token = localStorage.getItem("slably_token");
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
      localStorage.removeItem("slably_token");
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

function ProtectedRoute({ component: Component, roleRequired }: { component: any, roleRequired?: string | string[] }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-pulse flex items-center gap-2 font-display font-bold text-xl text-primary">Loading Slably...</div></div>;
  if (!user) {
    const currentPath = window.location.pathname + window.location.search;
    return <Redirect to={`/login?next=${encodeURIComponent(currentPath)}`} />;
  }
  if (roleRequired) {
    const allowed = Array.isArray(roleRequired) ? roleRequired : [roleRequired];
    if (!allowed.includes(user.role)) {
      const fallback = user.role === 'builder' ? '/dashboard' : user.role === 'subcontractor' ? '/sub-dashboard' : user.role === 'accountant' ? '/tax-pro' : '/client';
      return <Redirect to={fallback} />;
    }
  }
  
  return <Component />;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center bg-background"><div className="animate-pulse font-display font-bold text-xl text-primary">Loading...</div></div>;
  if (!user) return <Redirect to="/login" />;
  return <Redirect to={user.role === 'builder' || user.role === 'supplier' ? '/dashboard' : user.role === 'subcontractor' ? '/sub-dashboard' : user.role === 'accountant' ? '/tax-pro' : '/client'} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard"><ProtectedRoute component={BuilderDashboard} roleRequired={['builder', 'subcontractor', 'supplier']} /></Route>
      <Route path="/projects/:id"><ProtectedRoute component={ProjectDetails} roleRequired={["builder", "subcontractor", "supplier"]} /></Route>
      <Route path="/client/projects/:id"><ProtectedRoute component={ClientProjectView} roleRequired="client" /></Route>
      <Route path="/activities"><ProtectedRoute component={Activities} roleRequired="builder" /></Route>
      <Route path="/profile"><ProtectedRoute component={Profile} roleRequired={['builder', 'subcontractor', 'supplier']} /></Route>
      <Route path="/network"><ProtectedRoute component={Network} roleRequired={['builder', 'subcontractor', 'supplier']} /></Route>
      <Route path="/quotes/new"><ProtectedRoute component={NewQuote} roleRequired="builder" /></Route>
      <Route path="/quotes/:id"><ProtectedRoute component={QuoteDetail} roleRequired="builder" /></Route>
      <Route path="/quotes"><ProtectedRoute component={QuotesList} roleRequired="builder" /></Route>
      <Route path="/sub-dashboard"><ProtectedRoute component={SubDashboard} roleRequired={['subcontractor', 'supplier']} /></Route>
      <Route path="/my-work/:vendorId"><ProtectedRoute component={SubWorkDetail} roleRequired={['subcontractor', 'supplier']} /></Route>
      <Route path="/client"><ProtectedRoute component={ClientDashboard} roleRequired="client" /></Route>
      <Route path="/post-job"><ProtectedRoute component={PostJob} roleRequired="client" /></Route>
      <Route path="/tax-pro"><ProtectedRoute component={TaxProDashboard} roleRequired="accountant" /></Route>
      <Route path="/calendar"><ProtectedRoute component={CalendarPage} roleRequired={["builder", "subcontractor", "supplier"]} /></Route>
      <Route path="/marketplace"><ProtectedRoute component={Marketplace} roleRequired={["builder", "subcontractor", "supplier"]} /></Route>
      <Route path="/sub/:subId" component={SubProfile} />
      <Route path="/builder/:builderId" component={BuilderProfile} />
      <Route path="/find" component={Find} />
      <Route path="/invite/:token" component={InvitePage} />
      <Route path="/admin" component={AdminPanel} />
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
