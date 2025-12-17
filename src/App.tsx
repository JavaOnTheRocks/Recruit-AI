import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Onboarding from "./pages/Onboarding";
import AllProjects from "./pages/AllProjects";
import ProjectAgent from "./pages/ProjectAgent";
import ProjectDashboard from "./pages/ProjectDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Loading spinner component
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isOnboarded } = useApp();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  
  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}

// Auth route wrapper (redirects to projects if already authenticated)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isOnboarded } = useApp();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (isAuthenticated) {
    if (isOnboarded) {
      return <Navigate to="/projects" replace />;
    }
    return <Navigate to="/onboarding" replace />;
  }
  
  return <>{children}</>;
}

// Onboarding route wrapper
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isOnboarded } = useApp();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  
  if (isOnboarded) {
    return <Navigate to="/projects" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/signin" replace />} />
      <Route path="/signin" element={<AuthRoute><SignIn /></AuthRoute>} />
      <Route path="/signup" element={<AuthRoute><SignUp /></AuthRoute>} />
      <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
      <Route path="/projects" element={<ProtectedRoute><AllProjects /></ProtectedRoute>} />
      <Route path="/project/:projectId/agent" element={<ProtectedRoute><ProjectAgent /></ProtectedRoute>} />
      <Route path="/project/:projectId/dashboard" element={<ProtectedRoute><ProjectDashboard /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AppProvider>
  </QueryClientProvider>
);

export default App;
