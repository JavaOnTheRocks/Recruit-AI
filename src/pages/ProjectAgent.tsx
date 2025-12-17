import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/context/AppContext';
import { CloudUpload, Mail, FileText, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface EmailAttachment {
  messageId: string;
  subject: string;
  from: string;
  date: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export default function ProjectAgent() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, runScreeningAgent, isAuthenticated } = useApp();
  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('paste');
  const [jobDescription, setJobDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
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

  const handleScrapFromEmail = async () => {
    setIsEmailDialogOpen(true);
    setIsLoadingEmails(true);
    setEmailAttachments([]);
    setSelectedAttachments(new Set());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.provider_token) {
        toast({
          title: 'Google Sign-in Required',
          description: 'Please sign in with Google to access your emails.',
        });
        setIsEmailDialogOpen(false);
        setIsLoadingEmails(false);
        
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/gmail.readonly',
            redirectTo: window.location.href,
          },
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('gmail-scrape', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.requiresGoogleAuth) {
        toast({
          title: 'Re-authentication Required',
          description: data.message,
        });
        setIsEmailDialogOpen(false);
        
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/gmail.readonly',
            redirectTo: window.location.href,
          },
        });
        return;
      }

      if (data.attachments && data.attachments.length > 0) {
        setEmailAttachments(data.attachments);
        toast({
          title: 'Emails Scanned',
          description: `Found ${data.attachments.length} resume files in your inbox.`,
        });
      } else {
        toast({
          title: 'No Resumes Found',
          description: 'No PDF or DOC attachments found in your recent emails.',
        });
        setIsEmailDialogOpen(false);
      }
    } catch (error: unknown) {
      console.error('Email scrape error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to scan emails';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      setIsEmailDialogOpen(false);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const toggleAttachment = (attachmentId: string) => {
    setSelectedAttachments(prev => {
      const next = new Set(prev);
      if (next.has(attachmentId)) {
        next.delete(attachmentId);
      } else {
        next.add(attachmentId);
      }
      return next;
    });
  };

  const handleDownloadSelected = async () => {
    if (selectedAttachments.size === 0) {
      toast({
        title: 'No Files Selected',
        description: 'Please select at least one file to import.',
        variant: 'destructive',
      });
      return;
    }

    setIsDownloading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const selectedFiles = emailAttachments.filter(a => selectedAttachments.has(a.attachmentId));
      const downloadedFiles: File[] = [];

      for (const attachment of selectedFiles) {
        const { data, error } = await supabase.functions.invoke('gmail-download-attachment', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: {
            messageId: attachment.messageId,
            attachmentId: attachment.attachmentId,
            filename: attachment.filename,
            projectId,
          },
        });

        if (error) {
          console.error(`Failed to download ${attachment.filename}:`, error);
          continue;
        }

        const blob = new Blob([], { type: attachment.mimeType });
        const file = new File([blob], attachment.filename, { type: attachment.mimeType });
        (file as any).emailAttachment = true;
        (file as any).storagePath = data.storagePath;
        (file as any).storageUrl = data.url;
        downloadedFiles.push(file);
      }

      if (downloadedFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...downloadedFiles]);
        toast({
          title: 'Files Imported',
          description: `Successfully imported ${downloadedFiles.length} resume(s) from email.`,
        });
      }

      setIsEmailDialogOpen(false);
    } catch (error: unknown) {
      console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to download files';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
              onClick={handleScrapFromEmail}
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

      {/* Email Attachments Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Import Resumes from Gmail
            </DialogTitle>
            <DialogDescription>
              Select the resume files you want to import from your recent emails.
            </DialogDescription>
          </DialogHeader>

          {isLoadingEmails ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Scanning your emails for resume attachments...</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-2 py-4">
                {emailAttachments.map((attachment) => (
                  <div
                    key={attachment.attachmentId}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selectedAttachments.has(attachment.attachmentId)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-secondary/50'
                    }`}
                    onClick={() => toggleAttachment(attachment.attachmentId)}
                  >
                    <Checkbox
                      checked={selectedAttachments.has(attachment.attachmentId)}
                      onCheckedChange={() => toggleAttachment(attachment.attachmentId)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium truncate">{attachment.filename}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.size)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {attachment.subject}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        From: {attachment.from}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {selectedAttachments.size} file(s) selected
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEmailDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDownloadSelected}
                    disabled={isDownloading || selectedAttachments.size === 0}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Importing...
                      </>
                    ) : (
                      `Import ${selectedAttachments.size} File(s)`
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
