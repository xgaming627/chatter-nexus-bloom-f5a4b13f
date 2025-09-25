import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useNotifications } from '@/hooks/useNotifications';

const AppInitializer: React.FC = () => {
  const { currentUser } = useAuth();
  
  // Initialize activity tracker and notifications only after auth is ready
  useActivityTracker();
  useNotifications();

  return null; // This component doesn't render anything
};

export default AppInitializer;