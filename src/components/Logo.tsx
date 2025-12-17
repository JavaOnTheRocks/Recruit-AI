import { Rocket } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`${sizeClasses[size]} bg-primary rounded-lg flex items-center justify-center`}>
          <Rocket className="h-1/2 w-1/2 text-primary-foreground -rotate-45" />
        </div>
      </div>
      {showText && (
        <span className={`font-bold text-primary ${textSizeClasses[size]}`}>
          Recruit-AI
        </span>
      )}
    </div>
  );
}
