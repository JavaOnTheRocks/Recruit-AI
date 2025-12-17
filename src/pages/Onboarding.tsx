import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useApp } from '@/context/AppContext';
import { Workspace } from '@/types';
import { useToast } from '@/hooks/use-toast';

const roles: Workspace['role'][] = ['Recruiter', 'Founder', 'Hiring Manager', 'VC Talent Team'];

export default function Onboarding() {
  const [step, setStep] = useState<1 | 2>(1);
  const [organizationName, setOrganizationName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Workspace['role'] | null>(null);
  const { completeOnboarding, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    navigate('/signin');
    return null;
  }

  const progress = step === 1 ? 50 : 100;

  const handleContinue = () => {
    if (step === 1 && organizationName.trim()) {
      setStep(2);
    }
  };

  const handleFinish = () => {
    if (selectedRole && organizationName.trim()) {
      completeOnboarding(organizationName.trim(), selectedRole);
      toast({
        title: 'Setup complete!',
        description: 'Welcome to Recruit-AI. Let\'s start hiring!',
      });
      navigate('/projects');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-card rounded-xl shadow-card p-8 animate-fade-in">
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-3">
              Step {step} of 2
            </p>
            <ProgressBar progress={progress} />
          </div>

          {step === 1 ? (
            <div className="animate-slide-up">
              <h1 className="text-2xl font-bold text-foreground mb-6">
                Enter a name for your organization
              </h1>
              
              <div className="border-t border-border pt-6">
                <Input
                  placeholder="Recruit-AI Inc."
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="mb-6 bg-secondary border-0"
                />
                
                <Button 
                  onClick={handleContinue}
                  className="w-full"
                  disabled={!organizationName.trim()}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-slide-up">
              <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
                What role best describes you?
              </h1>
              
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                {roles.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
                      selectedRole === role
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-card text-foreground hover:border-primary/50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
              
              <Button 
                onClick={handleFinish}
                className="w-full"
                disabled={!selectedRole}
                variant={selectedRole ? 'default' : 'secondary'}
              >
                Finish Setup
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
