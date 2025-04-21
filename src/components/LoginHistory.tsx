
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Clock } from 'lucide-react';
import { format } from 'date-fns';

interface LoginRecord {
  timestamp: Date;
  ipAddress: string;
  location: string;
}

const LoginHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const [loginRecords, setLoginRecords] = useState<LoginRecord[]>([]);

  useEffect(() => {
    // In a real implementation, this would fetch from a database
    // For now, we'll generate mock data
    if (currentUser) {
      const mockData: LoginRecord[] = [
        {
          timestamp: new Date(),
          ipAddress: "192.168.1.1",
          location: "New York, USA"
        },
        {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          ipAddress: "192.168.1.1",
          location: "New York, USA"
        },
        {
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          ipAddress: "192.168.1.1",
          location: "New York, USA"
        }
      ];

      setLoginRecords(mockData);
    }
  }, [currentUser]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium">Recent Login Activity</h3>
      </div>

      <Table>
        <TableCaption>A list of your recent login sessions</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loginRecords.map((record, index) => (
            <TableRow key={index}>
              <TableCell>{format(record.timestamp, 'PPpp')}</TableCell>
              <TableCell>{record.ipAddress}</TableCell>
              <TableCell>{record.location}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-sm text-muted-foreground">
        If you notice any suspicious activity, please change your password immediately and contact support.
      </p>
    </div>
  );
};

export default LoginHistory;
