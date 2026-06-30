import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Menu from "@/pages/Menu";
import Race from "@/pages/Race";
import Leaderboard from "@/pages/Leaderboard";
import Login from "@/pages/Login";
import { AuthProvider, useAuth } from "@/auth/AuthContext";

const queryClient = new QueryClient();

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#050814" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="text-3xl font-black uppercase tracking-widest" style={{ color: "#00ffff", textShadow: "0 0 20px #00ffff" }}>
            APEX RUSH
          </div>
          <div className="text-gray-500 text-sm uppercase tracking-widest animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Switch>
      <Route path="/" component={Menu} />
      <Route path="/race" component={Race} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
