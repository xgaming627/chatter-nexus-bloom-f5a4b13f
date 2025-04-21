
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { LogIn, Globe, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Mock data structure for login history
interface LoginEvent {
  id: string;
  timestamp: Date;
  ip: string;
  location: string;
  device: string;
  successful: boolean;
  suspicious: boolean;
}

const LoginHistory: React.FC = () => {
  const { currentUser } = useAuth();
  const [loginHistory, setLoginHistory] = useState<LoginEvent[]>([]);
  
  useEffect(() => {
    if (!currentUser) return;
    
    // In a real app, this would fetch from Firestore/Supabase
    // For now, we'll generate mock data
    const generateMockLoginHistory = () => {
      const now = new Date();
      const mockData: LoginEvent[] = [];
      
      for (let i = 0; i < 20; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - Math.floor(i / 3));
        date.setHours(now.getHours() - (i % 3) * 4);
        
        mockData.push({
          id: `login-${i}`,
          timestamp: date,
          ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          location: ['New York, US', 'Los Angeles, US', 'Chicago, US', 'London, UK', 'Toronto, CA', 'Sydney, AU'][Math.floor(Math.random() * 6)],
          device: ['Chrome / Windows', 'Firefox / macOS', 'Safari / iOS', 'Chrome / Android', 'Edge / Windows'][Math.floor(Math.random() * 5)],
          successful: Math.random() > 0.1, // 10% chance of failed login
          suspicious: Math.random() > 0.9, // 10% chance of suspicious activity
        });
      }
      
      return mockData.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    };
    
    setLoginHistory(generateMockLoginHistory());
  }, [currentUser]);
  
  if (!currentUser) return null;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Login History</h3>
        <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          <Globe className="h-3 w-3 mr-1" /> Security Feature
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Review all recent login activities to ensure account security.
      </p>
      
      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableCaption>Your recent login activity</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loginHistory.map((event) => (
              <TableRow key={event.id} className={event.suspicious ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}>
                <TableCell>{format(event.timestamp, 'MMM dd, yyyy HH:mm')}</TableCell>
                <TableCell>{event.ip}</TableCell>
                <TableCell>{event.location}</TableCell>
                <TableCell>{event.device}</TableCell>
                <TableCell>
                  {event.successful ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <LogIn className="h-3 w-3 mr-1" /> Successful
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      Failed
                    </Badge>
                  )}
                  
                  {event.suspicious && (
                    <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                      <Shield className="h-3 w-3 mr-1" /> Suspicious
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default LoginHistory;
