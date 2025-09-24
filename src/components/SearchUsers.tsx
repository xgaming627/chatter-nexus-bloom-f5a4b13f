
import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChat } from '@/context/ChatContext';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from './UserAvatar';
import { supabase } from '@/integrations/supabase/client';

// Define a simpler User type that matches what we get from Firebase
interface SimpleUser {
  uid: string;
  displayName: string;
  username?: string;
  email?: string;
  photoURL?: string | null;
}

interface SearchUsersProps {
  onUserSelected?: (user: SimpleUser) => void;
}

const SearchUsers: React.FC<SearchUsersProps> = ({ onUserSelected }) => {
  const { createConversation, setCurrentConversationId } = useChat();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.length < 1) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('user_id, username, display_name, photo_url')
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
          .neq('user_id', currentUser?.uid) // Exclude current user from results
          .not('username', 'is', null) // Only show users with usernames
          .limit(10);

        if (error) throw error;

        const users: SimpleUser[] = profiles?.map(profile => ({
          uid: profile.user_id,
          displayName: profile.display_name || profile.username || 'User',
          username: profile.username || '',
          photoURL: profile.photo_url || null
        })) || [];
        
        console.log("Supabase search results:", users);
        setResults(users);
      } catch (error) {
        console.error("Error searching users:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleUserSelect = async (user: SimpleUser) => {
    setShowResults(false);
    setSearchQuery('');
    
    if (onUserSelected) {
      onUserSelected(user);
      return;
    }
    
    try {
      // Create a new conversation with the selected user
      const conversationId = await createConversation([user.uid]);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          className="pl-8 pr-4"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
        />
      </div>
      
      {showResults && (searchQuery.length > 0 || results.length > 0) && (
        <div className="absolute z-10 mt-1 w-full bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto animate-fade-in">
          {loading ? (
            <div className="p-3 text-center text-muted-foreground">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((user) => (
                <li key={user.uid}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2 py-2 h-auto"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar username={user.username || ''} photoURL={user.photoURL || undefined} size="sm" />
                      <div className="text-left">
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-xs text-muted-foreground">@{user.username}</div>
                      </div>
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          ) : searchQuery.length >= 1 ? (
            <div className="p-3 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="p-3 text-center text-muted-foreground">
              Start typing to search for users
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchUsers;
