import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, Workspace, Project, Candidate } from '@/types';

interface AppState {
  user: User | null;
  workspace: Workspace | null;
  projects: Project[];
  candidates: Candidate[];
  isAuthenticated: boolean;
  isOnboarded: boolean;
}

interface AppContextType extends AppState {
  setUser: (user: User | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  setProjects: (projects: Project[]) => void;
  setCandidates: (candidates: Candidate[]) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (fullName: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
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
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);

  const isAuthenticated = user !== null;
  const isOnboarded = workspace !== null;

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock login - in real app this would call API
    if (email && password) {
      setUser({
        id: '1',
        email,
        fullName: 'John Doe'
      });
      // Check if user has workspace (returning user)
      setWorkspace({
        id: '1',
        name: 'Recruit-AI Workspace',
        role: 'Recruiter',
        userId: '1'
      });
      return true;
    }
    return false;
  };

  const signup = async (fullName: string, email: string, password: string): Promise<boolean> => {
    // Mock signup - in real app this would call API
    if (fullName && email && password) {
      setUser({
        id: '1',
        email,
        fullName
      });
      // New user - no workspace yet
      setWorkspace(null);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    setWorkspace(null);
  };

  const completeOnboarding = (workspaceName: string, role: Workspace['role']) => {
    if (user) {
      setWorkspace({
        id: '1',
        name: workspaceName,
        role,
        userId: user.id
      });
    }
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
      setUser,
      setWorkspace,
      setProjects,
      setCandidates,
      login,
      signup,
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
