import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Circle } from 'lucide-react';

interface StatusSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
}

const StatusSelector: React.FC<StatusSelectorProps> = ({ value, onValueChange }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500';
      case 'away': return 'text-yellow-500';
      case 'dnd': return 'text-red-500';
      case 'offline': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'dnd': return 'Do Not Disturb';
      case 'offline': return 'Offline';
      default: return 'Offline';
    }
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <div className="flex items-center gap-2">
          <Circle className={`w-3 h-3 fill-current ${getStatusColor(value)}`} />
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {['online', 'away', 'dnd', 'offline'].map((status) => (
          <SelectItem key={status} value={status}>
            <div className="flex items-center gap-2">
              <Circle className={`w-3 h-3 fill-current ${getStatusColor(status)}`} />
              {getStatusLabel(status)}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default StatusSelector;