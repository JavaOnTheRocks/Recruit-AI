import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Workspace, Project, Candidate } from '@/types';

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
  completeOnboarding: (workspaceName: string, role: Workspace['role']) => void;
  addProject: (title: string) => void;
  updateCandidateStatus: (candidateId: string, status: Candidate['status']) => void;
  runScreeningAgent: (projectId: string, jobDescription: string, resumeCount: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock data for demo
const mockCandidates: Candidate[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Senior Product Manager',
    matchScore: 95,
    recommendation: 'Strong Match',
    badges: ['Top Match', 'Leadership Skills'],
    summary: 'Exceptional product leader with 7+ years driving successful product launches.',
    aiReasoning: [
      'Demonstrated strong leadership in agile development, leading a team of 5 engineers and consistently exceeding project goals.',
      'Successfully reduced project delivery time by 15% through process optimization and implementation of new CI/CD pipelines.',
      'Proficient in React, Node.js, and cloud platforms (AWS/Azure), with 7 years of hands-on experience in full-stack development.',
      'Experience mentoring junior developers and fostering a collaborative environment, contributing to team growth and knowledge sharing.'
    ],
    yearsExperience: 7,
    keySkills: ['Product Strategy', 'Agile', 'User Research', 'Data Analysis', 'Roadmapping'],
    projectsCompleted: 15,
    status: 'new',
    projectId: '1'
  },
  {
    id: '2',
    name: 'Bob Williams',
    email: 'bob@example.com',
    role: 'Lead Software Engineer',
    matchScore: 92,
    recommendation: 'Excellent Fit',
    badges: ['Culture Fit', 'Problem Solver', 'Agile Expert'],
    summary: 'Full-stack engineer with expertise in scalable systems and team leadership.',
    aiReasoning: [
      'Led architecture redesign resulting in 40% performance improvement.',
      'Strong TypeScript and React experience aligning with role requirements.',
      'Proven track record of mentoring and growing engineering teams.',
      'Excellent communication skills demonstrated in technical documentation.'
    ],
    yearsExperience: 8,
    keySkills: ['React', 'TypeScript', 'Node.js', 'AWS', 'System Design'],
    projectsCompleted: 22,
    status: 'new',
    projectId: '1'
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'Senior UX Designer',
    matchScore: 88,
    recommendation: 'High Potential',
    badges: ['Creative Thinker', 'User Centered'],
    summary: 'Creative UX designer passionate about creating intuitive user experiences.',
    aiReasoning: [
      'Portfolio showcases innovative design solutions for complex problems.',
      'Experience with design systems and component libraries.',
      'Strong user research and testing methodology.',
      'Collaborative approach to working with engineering teams.'
    ],
    yearsExperience: 6,
    keySkills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'A/B Testing'],
    projectsCompleted: 18,
    status: 'new',
    projectId: '1'
  },
  {
    id: '4',
    name: 'Diana Miller',
    email: 'diana@example.com',
    role: 'Data Scientist',
    matchScore: 85,
    recommendation: 'Good Match',
    badges: ['ML Expert', 'Data Driven'],
    summary: 'Data scientist with strong ML background and business acumen.',
    aiReasoning: [
      'PhD in Machine Learning with practical industry experience.',
      'Built ML models that increased revenue by 25%.',
      'Strong Python and SQL skills.',
      'Experience with big data technologies.'
    ],
    yearsExperience: 5,
    keySkills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Statistics'],
    projectsCompleted: 12,
    status: 'new',
    projectId: '1'
  },
  {
    id: '5',
    name: 'Eve Davis',
    email: 'eve@example.com',
    role: 'Marketing Manager',
    matchScore: 79,
    recommendation: 'Solid Candidate',
    badges: ['Growth Hacker'],
    summary: 'Results-driven marketer with experience in B2B SaaS growth.',
    aiReasoning: [
      'Track record of 3x growth in previous role.',
      'Strong analytical and data-driven approach.',
      'Experience with marketing automation tools.',
      'Good understanding of product-led growth.'
    ],
    yearsExperience: 4,
    keySkills: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics', 'HubSpot'],
    projectsCompleted: 8,
    status: 'new',
    projectId: '1'
  }
];

const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Senior Software Engineer Role',
    status: 'Active',
    createdAt: 'May 10, 2024',
    candidatesScreened: 120,
    emailsSent: 85,
    workspaceId: '1'
  },
  {
    id: '2',
    title: 'Product Manager - AI Platform',
    status: 'Active',
    createdAt: 'April 28, 2024',
    candidatesScreened: 80,
    emailsSent: 60,
    workspaceId: '1'
  },
  {
    id: '3',
    title: 'UX/UI Designer for Mobile App',
    status: 'Archived',
    createdAt: 'March 15, 2024',
    candidatesScreened: 30,
    emailsSent: 20,
    workspaceId: '1'
  },
  {
    id: '4',
    title: 'Data Scientist - Machine Learning',
    status: 'Draft',
    createdAt: 'Feb 01, 2024',
    candidatesScreened: 5,
    emailsSent: 3,
    workspaceId: '1'
  },
  {
    id: '5',
    title: 'Marketing Specialist - Digital Growth',
    status: 'Active',
    createdAt: 'Jan 22, 2024',
    candidatesScreened: 95,
    emailsSent: 70,
    workspaceId: '1'
  },
  {
    id: '6',
    title: 'Customer Success Representative',
    status: 'Archived',
    createdAt: 'Dec 05, 2023',
    candidatesScreened: 45,
    emailsSent: 30,
    workspaceId: '1'
  }
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
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

    // Check if user has completed onboarding (has role set)
    if (profile?.role) {
      setWorkspace({
        id: authUser.id,
        name: profile.full_name ? `${profile.full_name}'s Workspace` : 'My Workspace',
        role: profile.role as Workspace['role'],
        userId: authUser.id
      });
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        // Defer profile fetch to avoid deadlock
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

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        updateUserFromAuth(session.user);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
  };

  const completeOnboarding = async (workspaceName: string, role: Workspace['role']) => {
    if (!user) return;

    // Update profile with role
    const { error } = await supabase
      .from('profiles')
      .update({ role, full_name: user.fullName || workspaceName })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      return;
    }

    setWorkspace({
      id: user.id,
      name: workspaceName,
      role,
      userId: user.id
    });
  };

  const addProject = (title: string) => {
    const newProject: Project = {
      id: String(Date.now()),
      title,
      status: 'Draft',
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      candidatesScreened: 0,
      emailsSent: 0,
      workspaceId: workspace?.id || '1'
    };
    setProjects([newProject, ...projects]);
  };

  const updateCandidateStatus = (candidateId: string, status: Candidate['status']) => {
    setCandidates(candidates.map(c => 
      c.id === candidateId ? { ...c, status } : c
    ));
  };

  const runScreeningAgent = async (projectId: string, jobDescription: string, resumeCount: number): Promise<void> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate mock candidates for this project
    const newCandidates: Candidate[] = mockCandidates.map((c, i) => ({
      ...c,
      id: `${projectId}-${i + 1}`,
      projectId,
      status: 'new' as const
    }));
    
    setCandidates([...candidates, ...newCandidates]);
    
    // Update project stats
    setProjects(projects.map(p => 
      p.id === projectId 
        ? { ...p, candidatesScreened: p.candidatesScreened + resumeCount, status: 'Active' as const }
        : p
    ));
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
      runScreeningAgent
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
