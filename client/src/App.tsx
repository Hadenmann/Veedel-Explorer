import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./lib/auth";
import LoginPage from "./pages/login";
import MapPage from "./pages/map";
import VeedelDetail from "./pages/veedel-detail";
import SuggestionsPage from "./pages/suggestions";
import StatsPage from "./pages/stats";
import AchievementsPage from "./pages/achievements";
import NotFound from "./pages/not-found";
import { PerplexityAttribution } from "./components/PerplexityAttribution";

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/" component={MapPage} />
        <Route path="/veedel/:name" component={VeedelDetail} />
        <Route path="/vorschlaege" component={SuggestionsPage} />
        <Route path="/statistik" component={StatsPage} />
        <Route path="/achievements" component={AchievementsPage} />
        <Route component={NotFound} />
      </Switch>
      <PerplexityAttribution />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router hook={useHashLocation}>
          <AppRoutes />
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
