import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Database types
interface DbWorkspace {
  id: string;
  user_id: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface DbProject {
  id: string;
  workspace_id: string;
  title: string;
  status: string;
  job_description: string | null;
  candidates_screened: number;
  emails_sent: number;
  created_at: string;
  updated_at: string;
}

interface DbCandidate {
  id: string;
  project_id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  role: string | null;
  match_score: number;
  recommendation: string | null;
  badges: string[];
  summary: string | null;
  ai_reasoning: string[];
  years_experience: number | null;
  key_skills: string[];
  projects_completed: number;
  status: string;
  resume_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface AppUser {
  id: string;
  email: string;
  fullName: string;
  profilePicture?: string;
}

interface Workspace {
  id: string;
  name: string;
  role: 'Recruiter' | 'Founder' | 'Hiring Manager' | 'VC Talent Team';
  userId: string;
}

interface Project {
  id: string;
  title: string;
  status: 'Draft' | 'Active' | 'Archived';
  createdAt: string;
  candidatesScreened: number;
  emailsSent: number;
  workspaceId: string;
  jobDescription?: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  matchScore: number;
  recommendation: string;
  badges: string[];
  summary: string;
  aiReasoning: string[];
  yearsExperience: number;
  keySkills: string[];
  projectsCompleted: number;
  status: 'new' | 'shortlisted' | 'selected' | 'rejected';
  projectId: string;
  linkedinUrl?: string;
  resumeUrl?: string;
}

interface AppState {
  user: AppUser | null;
  workspace: Workspace | null;
  projects: Project[];
  candidates: Candidate[];
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
}

interface AppContextType extends AppState {
  setUser: (user: AppUser | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setProjects: (projects: Project[]) => void;
  setCandidates: (candidates: Candidate[]) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (fullName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: (workspaceName: string, role: Workspace['role']) => Promise<void>;
  addProject: (title: string) => Promise<void>;
  updateCandidateStatus: (candidateId: string, status: Candidate['status']) => Promise<void>;
  runScreeningAgent: (projectId: string, jobDescription: string, resumeFiles: File[]) => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchCandidates: (projectId: string) => Promise<void>;
  uploadResume: (projectId: string, file: File) => Promise<string | null>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper to convert database project to app project
const mapDbProject = (p: DbProject): Project => ({
  id: p.id,
  title: p.title,
  status: p.status as Project['status'],
  createdAt: new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
  candidatesScreened: p.candidates_screened,
  emailsSent: p.emails_sent,
  workspaceId: p.workspace_id,
  jobDescription: p.job_description || undefined,
});

// Helper to convert database candidate to app candidate
const mapDbCandidate = (c: DbCandidate): Candidate => ({
  id: c.id,
  name: c.name,
  email: c.email || '',
  role: c.role || '',
  matchScore: c.match_score,
  recommendation: c.recommendation || '',
  badges: c.badges || [],
  summary: c.summary || '',
  aiReasoning: c.ai_reasoning || [],
  yearsExperience: c.years_experience || 0,
  keySkills: c.key_skills || [],
  projectsCompleted: c.projects_completed,
  status: c.status as Candidate['status'],
  projectId: c.project_id,
  linkedinUrl: c.linkedin_url || undefined,
  resumeUrl: c.resume_url || undefined,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;
  const isOnboarded = workspace !== null;

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return profile as Profile | null;
  };

  // Fetch user's workspace
  const fetchWorkspace = async (userId: string): Promise<Workspace | null> => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching workspace:', error);
      return null;
    }

    if (data) {
      const ws = data as DbWorkspace;
      return {
        id: ws.id,
        name: ws.name,
        role: ws.role as Workspace['role'],
        userId: ws.user_id,
      };
    }
    return null;
  };

  // Fetch projects for workspace
  const fetchProjects = async () => {
    if (!workspace) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return;
    }

    setProjects((data as DbProject[]).map(mapDbProject));
  };

  // Fetch candidates for a project
  const fetchCandidates = async (projectId: string) => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('project_id', projectId)
      .order('match_score', { ascending: false });

    if (error) {
      console.error('Error fetching candidates:', error);
      return;
    }

    setCandidates((data as DbCandidate[]).map(mapDbCandidate));
  };

  // Update user state from auth user and profile
  const updateUserFromAuth = async (authUser: User | null) => {
    if (!authUser) {
      setUser(null);
      setWorkspace(null);
      return;
    }

    const profile = await fetchUserProfile(authUser.id);
    
    setUser({
      id: authUser.id,
      email: authUser.email || '',
      fullName: profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'User',
      profilePicture: profile?.avatar_url || authUser.user_metadata?.avatar_url
    });

    // Check if user has a workspace
    const ws = await fetchWorkspace(authUser.id);
    if (ws) {
      setWorkspace(ws);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          setTimeout(() => {
            updateUserFromAuth(session.user);
          }, 0);
        } else {
          setUser(null);
          setWorkspace(null);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        updateUserFromAuth(session.user);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch projects when workspace changes
  useEffect(() => {
    if (workspace) {
      fetchProjects();
    }
  }, [workspace]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Login error:', error.message);
      return false;
    }
    return true;
  };

  const signup = async (fullName: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName
        }
      }
    });
    
    if (error) {
      console.error('Signup error:', error.message);
      if (error.message.includes('already registered')) {
        return { success: false, error: 'This email is already registered. Please sign in instead.' };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const loginWithGoogle = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/projects`
      }
    });
    
    if (error) {
      console.error('Google login error:', error.message);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setWorkspace(null);
    setProjects([]);
    setCandidates([]);
  };

  const completeOnboarding = async (workspaceName: string, role: Workspace['role']) => {
    if (!user) return;

    // Create workspace in database
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        user_id: user.id,
        name: workspaceName,
        role: role
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating workspace:', error);
      return;
    }

    const ws = data as DbWorkspace;
    setWorkspace({
      id: ws.id,
      name: ws.name,
      role: ws.role as Workspace['role'],
      userId: ws.user_id
    });

    // Also update profile with role info
    await supabase
      .from('profiles')
      .update({ role: role })
      .eq('id', user.id);
  };

  const addProject = async (title: string) => {
    if (!workspace) return;

    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: workspace.id,
        title,
        status: 'Draft'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return;
    }

    const newProject = mapDbProject(data as DbProject);
    setProjects([newProject, ...projects]);
  };

  const updateCandidateStatus = async (candidateId: string, status: Candidate['status']) => {
    const { error } = await supabase
      .from('candidates')
      .update({ status })
      .eq('id', candidateId);

    if (error) {
      console.error('Error updating candidate status:', error);
      return;
    }

    setCandidates(candidates.map(c => 
      c.id === candidateId ? { ...c, status } : c
    ));
  };

  const uploadResume = async (projectId: string, file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${projectId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading resume:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const runScreeningAgent = async (projectId: string, jobDescription: string, resumeFiles: File[]): Promise<void> => {
    if (!user || !workspace) return;

    // Save job description to project
    await supabase
      .from('projects')
      .update({ job_description: jobDescription })
      .eq('id', projectId);

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate mock candidates (in production, this would call an AI service)
    const mockNames = ['Alice Johnson', 'Bob Williams', 'Charlie Brown', 'Diana Miller', 'Eve Davis'];
    const mockRoles = ['Senior Product Manager', 'Lead Software Engineer', 'Senior UX Designer', 'Data Scientist', 'Marketing Manager'];
    
    const newCandidates: DbCandidate[] = resumeFiles.slice(0, 5).map((file, i) => ({
      id: crypto.randomUUID(),
      project_id: projectId,
      name: mockNames[i] || `Candidate ${i + 1}`,
      email: `candidate${i + 1}@example.com`,
      linkedin_url: null,
      role: mockRoles[i] || 'Candidate',
      match_score: Math.floor(Math.random() * 25) + 75,
      recommendation: ['Strong Match', 'Excellent Fit', 'High Potential', 'Good Match', 'Solid Candidate'][i] || 'Good Match',
      badges: [['Top Match', 'Leadership Skills'], ['Culture Fit', 'Problem Solver'], ['Creative Thinker'], ['ML Expert'], ['Growth Hacker']][i] || [],
      summary: `Experienced professional with strong background in ${mockRoles[i] || 'their field'}.`,
      ai_reasoning: [
        'Strong relevant experience matching job requirements.',
        'Demonstrated leadership and problem-solving skills.',
        'Technical skills align well with position needs.',
        'Good cultural fit based on profile analysis.'
      ],
      years_experience: Math.floor(Math.random() * 5) + 4,
      key_skills: ['Leadership', 'Communication', 'Problem Solving', 'Technical Skills', 'Teamwork'],
      projects_completed: Math.floor(Math.random() * 15) + 5,
      status: 'new',
      resume_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Insert candidates into database
    const { data: insertedCandidates, error } = await supabase
      .from('candidates')
      .insert(newCandidates.map(c => ({
        project_id: c.project_id,
        name: c.name,
        email: c.email,
        linkedin_url: c.linkedin_url,
        role: c.role,
        match_score: c.match_score,
        recommendation: c.recommendation,
        badges: c.badges,
        summary: c.summary,
        ai_reasoning: c.ai_reasoning,
        years_experience: c.years_experience,
        key_skills: c.key_skills,
        projects_completed: c.projects_completed,
        status: c.status,
        resume_url: c.resume_url,
      })))
      .select();

    if (error) {
      console.error('Error inserting candidates:', error);
      return;
    }

    // Update project stats
    await supabase
      .from('projects')
      .update({ 
        candidates_screened: resumeFiles.length,
        status: 'Active'
      })
      .eq('id', projectId);

    // Refresh data
    await fetchProjects();
    await fetchCandidates(projectId);
  };

  return (
    <AppContext.Provider value={{
      user,
      workspace,
      projects,
      candidates,
      isAuthenticated,
      isOnboarded,
      isLoading,
      setUser,
      setWorkspace,
      setProjects,
      setCandidates,
      login,
      signup,
      loginWithGoogle,
      logout,
      completeOnboarding,
      addProject,
      updateCandidateStatus,
      runScreeningAgent,
      fetchProjects,
      fetchCandidates,
      uploadResume
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
