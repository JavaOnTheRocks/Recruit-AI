import { ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { 
  Home, 
  Users, 
  BarChart3, 
  Settings, 
  HelpCircle, 
  Menu,
  ChevronLeft
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

interface NavItem {
  icon: ReactNode;
  label: string;
  href: string;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { workspace, user } = useApp();
  const location = useLocation();
  const { projectId } = useParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const isProjectView = location.pathname.includes('/project/');

  const globalNavItems: NavItem[] = [
    { icon: <Home className="h-5 w-5" />, label: 'All Projects', href: '/projects' },
  ];

  const projectNavItems: NavItem[] = [
    { icon: <Users className="h-5 w-5" />, label: 'Agent', href: `/project/${projectId}/agent` },
    { icon: <BarChart3 className="h-5 w-5" />, label: 'Dashboard', href: `/project/${projectId}/dashboard` },
  ];

  const navItems = isProjectView ? projectNavItems : globalNavItems;

  const isActiveLink = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40 flex flex-col ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!sidebarCollapsed && <Logo size="md" />}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {sidebarCollapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {/* Back to projects link when in project view */}
        {isProjectView && !sidebarCollapsed && (
          <div className="px-3 py-2 border-b border-sidebar-border">
            <Link 
              to="/projects"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Projects
            </Link>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                isActiveLink(item.href)
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
              }`}
            >
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Link
            to="/support"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200"
          >
            <HelpCircle className="h-5 w-5" />
            {!sidebarCollapsed && <span>Support</span>}
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200"
          >
            <Settings className="h-5 w-5" />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
          
          {!sidebarCollapsed && workspace && (
            <div className="px-3 py-2 mt-2">
              <p className="text-sm font-medium text-sidebar-accent-foreground truncate">
                {workspace.name}
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Top Header */}
        <header className="h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Additional header content can go here */}
          </div>
          
          <div className="flex items-center gap-4">
            <Avatar className="h-9 w-9 border-2 border-primary/20">
              <AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {user?.fullName?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-6 py-4 text-center text-sm text-muted-foreground border-t border-border">
          © 2025 Recruit-AI. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
