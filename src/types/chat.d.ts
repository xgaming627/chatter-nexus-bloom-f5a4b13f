
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  username: string;
  description?: string;
  onlineStatus?: 'online' | 'away' | 'offline';
  reason?: string; // Added the missing reason property
}
