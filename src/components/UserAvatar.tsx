
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  username?: string;
  photoURL?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isNexusPlus?: boolean;
  userRole?: 'admin' | 'moderator' | 'user';
  showRoleBadge?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  username, 
  photoURL, 
  size = 'md', 
  isNexusPlus = false,
  userRole = 'user',
  showRoleBadge = true
}) => {
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

  const shouldShowRoleBadge = showRoleBadge && (userRole === 'admin' || userRole === 'moderator');
  
  // Size-specific badge sizes
  const badgeSizes = {
    sm: 'h-3 w-3',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5'
  };

  const badgeIconSizes = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4'
  };

  return (
    <div className="relative inline-block">
      <Avatar className={cn(
        sizeClasses[size],
        isNexusPlus && "ring-2 ring-yellow-500 animate-pulse",
        userRole === 'admin' && "ring-2 ring-red-500"
      )}>
        {photoURL && <AvatarImage src={photoURL} alt={username || 'User'} />}
        <AvatarFallback className={cn(
          "bg-primary text-primary-foreground font-bold",
          isNexusPlus && "bg-gradient-to-br from-yellow-400 via-yellow-500 to-amber-500 text-white",
          userRole === 'admin' && "bg-gradient-to-br from-red-500 to-orange-500 text-white"
        )}>
          {getFallbackInitial()}
        </AvatarFallback>
      </Avatar>
      <div className="absolute -bottom-1 -right-1 flex gap-0.5">
        {isNexusPlus && (
          <div className={cn(
            "bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg",
            badgeSizes[size]
          )}>
            <Crown className={cn("text-white", badgeIconSizes[size])} />
          </div>
        )}
        {shouldShowRoleBadge && (
          <div className={cn(
            "rounded-full flex items-center justify-center shadow-lg",
            badgeSizes[size],
            userRole === 'admin' 
              ? "bg-gradient-to-br from-red-500 to-red-700" 
              : "bg-gradient-to-br from-blue-500 to-blue-700"
          )}>
            <Shield className={cn("text-white", badgeIconSizes[size])} />
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAvatar;
