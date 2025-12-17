import { Candidate } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CheckCircle, Linkedin, X } from 'lucide-react';

interface CandidateDetailModalProps {
  candidate: Candidate | null;
  isOpen: boolean;
  onClose: () => void;
  onShortlist: () => void;
  onReject: () => void;
}

export function CandidateDetailModal({ 
  candidate, 
  isOpen, 
  onClose, 
  onShortlist, 
  onReject 
}: CandidateDetailModalProps) {
  if (!candidate) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-score-high';
    if (score >= 70) return 'text-warning';
    return 'text-score-low';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-xl font-bold">{candidate.name}</DialogTitle>
              <a 
                href={candidate.linkedinUrl || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
            
            {/* Score Circle */}
            <div className="relative h-20 w-20 flex items-center justify-center">
              <svg className="absolute inset-0 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-secondary"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${candidate.matchScore * 2.83} 283`}
                  className={getScoreColor(candidate.matchScore)}
                />
              </svg>
              <span className={`text-lg font-bold ${getScoreColor(candidate.matchScore)}`}>
                {candidate.matchScore}%
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* AI Reasoning Section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Why we matched this profile
            </h3>
            <div className="space-y-3">
              {candidate.aiReasoning.map((reason, index) => (
                <div 
                  key={index}
                  className="flex gap-3 p-3 bg-secondary/50 rounded-lg animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Experience Summary */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">
              Experience Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Years XP</p>
                <p className="text-2xl font-bold text-foreground">{candidate.yearsExperience}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Key Skills</p>
                <p className="text-sm font-medium text-foreground">
                  {candidate.keySkills.join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              className="text-destructive border-destructive hover:bg-destructive/10"
              onClick={onReject}
            >
              Reject
            </Button>
            <Button onClick={onShortlist}>
              Shortlist
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
