import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/context/AppContext';
import { CloudUpload, Mail, FileText, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProjectAgent() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, runScreeningAgent, isAuthenticated } = useApp();
  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('paste');
  const [jobDescription, setJobDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const project = projects.find(p => p.id === projectId);

  if (!isAuthenticated) {
    navigate('/signin');
    return null;
  }

  if (!project) {
    navigate('/projects');
    return null;
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf' || 
              file.type === 'application/msword' ||
              file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleRunAgent = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: 'Job Description Required',
        description: 'Please enter a job description before running the screening agent.',
        variant: 'destructive'
      });
      return;
    }

    if (uploadedFiles.length === 0) {
      toast({
        title: 'Resumes Required',
        description: 'Please upload at least one resume to screen.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      await runScreeningAgent(projectId!, jobDescription, uploadedFiles);
      toast({
        title: 'Screening Complete!',
        description: `Successfully analyzed ${uploadedFiles.length} candidates.`,
      });
      navigate(`/project/${projectId}/dashboard`);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to process resumes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground mb-6">Project Agent</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job Description Section */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Job Description</h2>
            
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'paste' | 'upload')}>
              <TabsList className="mb-4 bg-secondary">
                <TabsTrigger value="paste" className="data-[state=active]:bg-card">
                  <FileText className="h-4 w-4 mr-2" />
                  Paste Text
                </TabsTrigger>
                <TabsTrigger value="upload" className="data-[state=active]:bg-card">
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Upload File
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {inputMode === 'paste' ? (
              <Textarea
                placeholder="Paste your job description here. Include key responsibilities, qualifications, and preferred skills for optimal AI screening."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[280px] resize-none bg-secondary/50 border-0"
              />
            ) : (
              <div className="min-h-[280px] flex flex-col">
                <div
                  className="flex-1 border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center border-border hover:border-primary/50 hover:bg-secondary/50"
                  onClick={() => document.getElementById('jd-file-input')?.click()}
                >
                  <FileText className="h-10 w-10 mb-3 text-primary" />
                  <p className="text-primary font-medium">
                    Click to upload Job Description file
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports PDF, DOC, DOCX, TXT
                  </p>
                  <input
                    id="jd-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // For text files, read content directly
                        if (file.type === 'text/plain') {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setJobDescription(event.target?.result as string);
                            setInputMode('paste');
                            toast({
                              title: 'File Loaded',
                              description: `Loaded job description from ${file.name}`,
                            });
                          };
                          reader.readAsText(file);
                        } else {
                          // For PDF/DOC files, show filename and note
                          setJobDescription(`[Uploaded: ${file.name}]\n\nNote: PDF/DOC file content extraction requires backend processing. For now, please paste the text content directly.`);
                          setInputMode('paste');
                          toast({
                            title: 'File Selected',
                            description: 'For best results, paste the job description text directly.',
                          });
                        }
                      }
                    }}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Resume Upload Section */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Candidate Resumes</h2>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer min-h-[200px] flex flex-col items-center justify-center ${
                isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-secondary/50'
              }`}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <CloudUpload className={`h-10 w-10 mb-3 ${isDragging ? 'text-primary' : 'text-primary'}`} />
              <p className="text-primary font-medium">
                Drag & drop resume files here, or click to browse.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports PDF, DOC, DOCX
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Scrap from Email Button */}
            <Button 
              variant="outline" 
              className="w-full mt-4 gap-2"
              onClick={() => {
                toast({
                  title: 'Coming soon',
                  description: 'Email integration will be available soon.',
                });
              }}
            >
              <Mail className="h-4 w-4" />
              Scrap from Email
            </Button>
          </div>
        </div>

        {/* Run Agent Button */}
        <div className="flex justify-center mt-8">
          <Button 
            size="lg"
            onClick={handleRunAgent}
            disabled={isProcessing}
            className="px-12 gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing Resumes...
              </>
            ) : (
              'Run Screening Agent'
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
