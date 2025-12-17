import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useApp } from '@/context/AppContext';
import { Plus, Search, FolderOpen, Users, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AllProjects() {
  const { projects, addProject, isAuthenticated, isOnboarded } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not authenticated or onboarded
  if (!isAuthenticated) {
    navigate('/signin');
    return null;
  }

  if (!isOnboarded) {
    navigate('/onboarding');
    return null;
  }

  const filteredProjects = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProject = () => {
    if (newProjectTitle.trim()) {
      addProject(newProjectTitle.trim());
      setNewProjectTitle('');
      setIsDialogOpen(false);
      toast({
        title: 'Project created!',
        description: 'Your new project has been created successfully.',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-badge-active text-badge-active-text">Active</span>;
      case 'Draft':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-badge-draft text-badge-draft-text">Draft</span>;
      case 'Archived':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-badge-archived text-badge-archived-text">Archived</span>;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-foreground">All Projects</h1>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Enter project title (e.g., Senior React Developer)"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!newProjectTitle.trim()}>
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, index) => (
            <div
              key={project.id}
              onClick={() => navigate(`/project/${project.id}/agent`)}
              className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer border border-border hover:border-primary/20 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                {getStatusBadge(project.status)}
              </div>
              
              <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                {project.title}
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4">
                Created on {project.createdAt}
              </p>
              
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{project.candidatesScreened} Candidates Screened</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{project.emailsSent} Emails Sent</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No projects found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search query' : 'Create your first project to get started'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
