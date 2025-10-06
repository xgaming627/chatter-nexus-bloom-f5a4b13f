
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  username?: string;
  photoURL?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isNexusPlus?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ username, photoURL, size = 'md', isNexusPlus = false }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-24 w-24 text-4xl',
  };
  
  const getFallbackInitial = () => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  return (
    <div className="relative inline-block">
      <Avatar className={cn(
        sizeClasses[size],
        isNexusPlus && "ring-2 ring-yellow-500"
      )}>
        {photoURL && <AvatarImage src={photoURL} alt={username || 'User'} />}
        <AvatarFallback className={cn(
          "bg-primary text-primary-foreground",
          isNexusPlus && "bg-gradient-to-br from-yellow-400 to-amber-500"
        )}>
          {getFallbackInitial()}
        </AvatarFallback>
      </Avatar>
      {isNexusPlus && (
        <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-0.5">
          <Crown className="h-3 w-3 text-white" />
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
