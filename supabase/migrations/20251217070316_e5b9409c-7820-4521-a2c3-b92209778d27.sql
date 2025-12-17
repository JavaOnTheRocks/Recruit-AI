-- Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Recruiter', 'Founder', 'Hiring Manager', 'VC Talent Team')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Active', 'Archived')),
  job_description TEXT,
  candidates_screened INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  role TEXT,
  match_score INTEGER DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  recommendation TEXT,
  badges JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  ai_reasoning JSONB DEFAULT '[]'::jsonb,
  years_experience INTEGER,
  key_skills JSONB DEFAULT '[]'::jsonb,
  projects_completed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'shortlisted', 'selected', 'rejected')),
  resume_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resumes storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- Create job descriptions storage bucket (for uploaded JD files)
INSERT INTO storage.buckets (id, name, public) VALUES ('job-descriptions', 'job-descriptions', false);

-- Enable RLS on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Workspaces policies
CREATE POLICY "Users can view their own workspace"
ON public.workspaces FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workspace"
ON public.workspaces FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workspace"
ON public.workspaces FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workspace"
ON public.workspaces FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Helper function to get user's workspace id
CREATE OR REPLACE FUNCTION public.get_user_workspace_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.workspaces WHERE user_id = user_uuid LIMIT 1;
$$;

-- Projects policies
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
TO authenticated
USING (workspace_id = public.get_user_workspace_id(auth.uid()));

CREATE POLICY "Users can create projects in their workspace"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (workspace_id = public.get_user_workspace_id(auth.uid()));

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
TO authenticated
USING (workspace_id = public.get_user_workspace_id(auth.uid()));

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
TO authenticated
USING (workspace_id = public.get_user_workspace_id(auth.uid()));

-- Helper function to check if user owns a project
CREATE OR REPLACE FUNCTION public.user_owns_project(project_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.workspaces w ON p.workspace_id = w.id
    WHERE p.id = project_uuid AND w.user_id = auth.uid()
  );
$$;

-- Candidates policies
CREATE POLICY "Users can view candidates in their projects"
ON public.candidates FOR SELECT
TO authenticated
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can create candidates in their projects"
ON public.candidates FOR INSERT
TO authenticated
WITH CHECK (public.user_owns_project(project_id));

CREATE POLICY "Users can update candidates in their projects"
ON public.candidates FOR UPDATE
TO authenticated
USING (public.user_owns_project(project_id));

CREATE POLICY "Users can delete candidates in their projects"
ON public.candidates FOR DELETE
TO authenticated
USING (public.user_owns_project(project_id));

-- Storage policies for resumes bucket
CREATE POLICY "Users can upload resumes to their projects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for job-descriptions bucket
CREATE POLICY "Users can upload JDs to their folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-descriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own JDs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'job-descriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own JDs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'job-descriptions' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_candidates_project_id ON public.candidates(project_id);
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_candidates_match_score ON public.candidates(match_score DESC);