export interface User {
  id: string;
  email: string;
  fullName: string;
  profilePicture?: string;
}

export interface Workspace {
  id: string;
  name: string;
  role: 'Recruiter' | 'Founder' | 'Hiring Manager' | 'VC Talent Team';
  userId: string;
}

export interface Project {
  id: string;
  title: string;
  status: 'Active' | 'Draft' | 'Archived';
  createdAt: string;
  candidatesScreened: number;
  emailsSent: number;
  workspaceId: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  linkedinUrl?: string;
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
}

export type OnboardingStep = 'organization' | 'role';
