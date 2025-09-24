import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Circle, Minus, UserX } from 'lucide-react';
import { useChat } from '@/context/ChatContext';

interface StatusSelectorProps {
  currentStatus: 'online' | 'away' | 'offline';
  onStatusChange: (status: 'online' | 'away' | 'offline') => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ currentStatus, onStatusChange }) => {
  const { updateOnlineStatus } = useChat();

  const handleStatusChange = (status: 'online' | 'away' | 'offline') => {
    onStatusChange(status);
    updateOnlineStatus(status);
  };

  const getStatusIcon = (status: 'online' | 'away' | 'offline') => {
    switch (status) {
      case 'online':
        return <Circle className="h-3 w-3 fill-green-500 text-green-500" />;
      case 'away':
        return <Minus className="h-3 w-3 text-yellow-500" />;
      case 'offline':
        return <UserX className="h-3 w-3 text-gray-400" />;
    }
  };

  const getStatusText = (status: 'online' | 'away' | 'offline') => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'offline':
        return 'Offline';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 gap-2">
          {getStatusIcon(currentStatus)}
          <span className="text-sm">{getStatusText(currentStatus)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => handleStatusChange('online')}>
          <Circle className="h-3 w-3 fill-green-500 text-green-500 mr-2" />
          Online
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange('away')}>
          <Minus className="h-3 w-3 text-yellow-500 mr-2" />
          Away
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleStatusChange('offline')}>
          <UserX className="h-3 w-3 text-gray-400 mr-2" />
          Offline
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusSelector;