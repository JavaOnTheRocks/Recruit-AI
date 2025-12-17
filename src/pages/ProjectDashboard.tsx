import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CandidateDetailModal } from '@/components/candidates/CandidateDetailModal';
import { useApp } from '@/context/AppContext';
import { Eye, Bookmark, Trophy, Star, FileText, Share2, Trash2, Mail, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Candidate } from '@/types';

export default function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();
  const { candidates, updateCandidateStatus, isAuthenticated, projects } = useApp();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!isAuthenticated) {
    navigate('/signin');
    return null;
  }

  const project = projects.find(p => p.id === projectId);
  const projectCandidates = candidates.filter(c => c.projectId === projectId || projectId === '1');
  
  const leaderboardCandidates = projectCandidates
    .filter(c => c.status === 'new')
    .sort((a, b) => b.matchScore - a.matchScore);
  
  const shortlistedCandidates = projectCandidates.filter(c => c.status === 'shortlisted');
  const selectedCandidates = projectCandidates.filter(c => c.status === 'selected');

  const handleViewCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  const handleShortlist = (candidateId: string) => {
    updateCandidateStatus(candidateId, 'shortlisted');
    toast({
      title: 'Candidate Shortlisted',
      description: 'The candidate has been moved to your shortlist.',
    });
    setIsModalOpen(false);
  };

  const handleReject = (candidateId: string) => {
    updateCandidateStatus(candidateId, 'rejected');
    toast({
      title: 'Candidate Rejected',
      description: 'The candidate has been removed from consideration.',
    });
    setIsModalOpen(false);
  };

  const handleSelect = (candidateId: string) => {
    updateCandidateStatus(candidateId, 'selected');
    toast({
      title: 'Candidate Selected!',
      description: 'The candidate has been marked as selected for the role.',
    });
  };

  const getRecommendationBadge = (recommendation: string, score: number) => {
    const colors = score >= 90 
      ? 'bg-badge-active text-badge-active-text' 
      : score >= 80 
        ? 'bg-primary/10 text-primary'
        : 'bg-secondary text-secondary-foreground';
    
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`}>
        {recommendation}
      </span>
    );
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Trophy className="h-4 w-4 text-amber-600" />;
    return null;
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground mb-6">Project Dashboard</h1>

        <Tabs defaultValue="leaderboard" className="w-full">
          <div className="flex justify-center mb-6">
            <TabsList className="bg-secondary">
              <TabsTrigger value="leaderboard" className="data-[state=active]:bg-card px-6">
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="shortlisted" className="data-[state=active]:bg-card px-6">
                Shortlisted ({shortlistedCandidates.length})
              </TabsTrigger>
              <TabsTrigger value="selected" className="data-[state=active]:bg-card px-6">
                Selected ({selectedCandidates.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-secondary/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">Rank</div>
                <div className="col-span-4">Candidate Name</div>
                <div className="col-span-2 text-center">Match Score</div>
                <div className="col-span-3">Recommendation</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-border">
                {leaderboardCandidates.map((candidate, index) => {
                  const rank = index + 1;
                  const isTopThree = rank <= 3;
                  
                  return (
                    <div 
                      key={candidate.id}
                      className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-secondary/30 ${
                        isTopThree ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="col-span-1 flex items-center gap-2">
                        {getRankIcon(rank)}
                        <span className={`font-medium ${isTopThree ? 'text-primary' : 'text-muted-foreground'}`}>
                          {rank}
                        </span>
                      </div>
                      
                      <div className="col-span-4 flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://i.pravatar.cc/100?u=${candidate.id}`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{candidate.name}</span>
                      </div>
                      
                      <div className="col-span-2 text-center">
                        <span className={`text-xl font-bold ${
                          candidate.matchScore >= 90 ? 'text-score-high' : 
                          candidate.matchScore >= 70 ? 'text-warning' : 'text-score-low'
                        }`}>
                          {candidate.matchScore}%
                        </span>
                      </div>
                      
                      <div className="col-span-3">
                        {getRecommendationBadge(candidate.recommendation, candidate.matchScore)}
                      </div>
                      
                      <div className="col-span-2 flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleViewCandidate(candidate)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleShortlist(candidate.id)}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {leaderboardCandidates.length === 0 && (
                <div className="px-6 py-12 text-center text-muted-foreground">
                  <p>No candidates to display. Run the screening agent to analyze resumes.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Shortlisted Tab */}
          <TabsContent value="shortlisted">
            <div className="space-y-4">
              <p className="text-muted-foreground text-center mb-4">
                These are the top candidates identified by Recruit-AI for further review.
              </p>
              
              {shortlistedCandidates.map((candidate, index) => (
                <div 
                  key={candidate.id}
                  className={`bg-card rounded-xl p-5 shadow-card border-2 transition-all hover:shadow-card-hover animate-slide-up ${
                    index === 0 ? 'border-primary' : 'border-border'
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={`https://i.pravatar.cc/100?u=${candidate.id}`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-lg">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-success border-2 border-card" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">{candidate.name}</h3>
                        <p className="text-sm text-muted-foreground">{candidate.role}</p>
                        <div className="flex gap-2 mt-2">
                          {candidate.badges.slice(0, 3).map((badge, i) => (
                            <span key={i} className="px-2 py-0.5 bg-secondary text-xs rounded-md text-muted-foreground">
                              {badge}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-3xl font-bold text-score-high">{candidate.matchScore}</span>
                        <p className="text-xs text-muted-foreground">% Match</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleViewCandidate(candidate)}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => handleReject(candidate.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button onClick={() => handleSelect(candidate.id)} className="gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Select Candidate
                    </Button>
                  </div>
                </div>
              ))}

              {shortlistedCandidates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No shortlisted candidates yet.</p>
                  <p className="text-sm">Use the bookmark icon on the leaderboard to shortlist candidates.</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Selected Tab */}
          <TabsContent value="selected">
            {selectedCandidates.length > 0 ? (
              <div className="space-y-4">
                <p className="text-primary text-center mb-4">
                  This view displays the candidate(s) officially selected for the role.
                </p>

                {selectedCandidates.map((candidate) => (
                  <div key={candidate.id} className="bg-card rounded-xl p-6 shadow-card border border-border">
                    <div className="flex items-start gap-6">
                      <div className="relative">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={`https://i.pravatar.cc/100?u=${candidate.id}`} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-2xl">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-success border-2 border-card" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-2xl font-bold text-foreground">{candidate.name}</h2>
                            <p className="text-muted-foreground">{candidate.role}</p>
                          </div>

                          <div className="bg-primary/10 rounded-lg p-4 text-center">
                            <p className="text-xs text-primary uppercase font-medium mb-1">Match Score</p>
                            <span className="text-4xl font-bold text-score-high">{candidate.matchScore}%</span>
                            <div className="mt-2">
                              <span className="px-3 py-1 bg-success/10 text-success text-xs font-medium rounded-full flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                Elite Talent
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-foreground mt-4">{candidate.summary}</p>

                        <div className="mt-4">
                          <h4 className="font-semibold text-foreground mb-2">Key Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {candidate.keySkills.map((skill, i) => (
                              <span key={i} className="px-3 py-1 bg-secondary rounded-md text-sm text-foreground">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div className="bg-secondary/50 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-foreground">{candidate.yearsExperience}+</p>
                            <p className="text-sm text-muted-foreground">Years Experience</p>
                          </div>
                          <div className="bg-secondary/50 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-foreground">{candidate.projectsCompleted}</p>
                            <p className="text-sm text-muted-foreground">Projects Completed</p>
                          </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                          <Button className="gap-2">
                            <Mail className="h-4 w-4" />
                            Contact Candidate
                          </Button>
                          <Button variant="outline" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Generate Offer
                          </Button>
                          <Button variant="outline" className="gap-2 text-destructive border-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                            Archive Project
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-border">
                      <h4 className="font-semibold text-foreground mb-3">Next Steps for Project Completion</h4>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          Send offer letter to {candidate.name.split(' ')[0]}.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          Initiate background check and onboarding process.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          Update project status to 'Closed - Candidate Selected'.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                          Communicate selection results to other shortlisted candidates.
                        </li>
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No selected candidates yet.</p>
                <p className="text-sm">Select a candidate from the shortlist to hire them.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CandidateDetailModal
          candidate={selectedCandidate}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onShortlist={() => selectedCandidate && handleShortlist(selectedCandidate.id)}
          onReject={() => selectedCandidate && handleReject(selectedCandidate.id)}
        />
      </div>
    </DashboardLayout>
  );
}
