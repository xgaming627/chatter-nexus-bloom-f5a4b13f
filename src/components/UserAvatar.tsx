
import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface UserAvatarProps {
  username?: string;
  photoURL?: string;
  size?: 'sm' | 'md' | 'lg';
}

const UserAvatar: React.FC<UserAvatarProps> = ({ username, photoURL, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };
  
  const getFallbackInitial = () => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
  };

  return (
    <Avatar className={sizeClasses[size]}>
      {photoURL && <AvatarImage src={photoURL} alt={username || 'User'} />}
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getFallbackInitial()}
      </AvatarFallback>
    </Avatar>
  );
};

export default UserAvatar;
