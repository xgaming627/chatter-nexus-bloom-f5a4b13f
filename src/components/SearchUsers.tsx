
import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useChat } from '@/context/ChatContext';
import UserAvatar from './UserAvatar';
import { ExtendedUser, User } from '@/types/supabase';
import { collection, query, getDocs, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface SearchUsersProps {
  onUserSelected?: (user: ExtendedUser) => void;
}

const SearchUsers: React.FC<SearchUsersProps> = ({ onUserSelected }) => {
  const { searchUsers, createConversation, setCurrentConversationId } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ExtendedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleSearch = async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }
      
      setLoading(true);
      try {
        // Use direct Firebase querying instead of relying on context function
        const usersRef = collection(db, "users");
        const q = query(
          usersRef,
          where("displayName", ">=", searchQuery),
          where("displayName", "<=", searchQuery + '\uf8ff'),
          limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        const users: ExtendedUser[] = [];
        
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          // Create a simplified user object that matches our User interface
          // Then cast it as ExtendedUser to satisfy the type requirement
          const simpleUser: User = {
            uid: userData.uid,
            displayName: userData.displayName || 'Unknown User',
            username: userData.username || '',
            photoURL: userData.photoURL || null,
            email: userData.email || null
          };
          
          // Cast this simplified user as ExtendedUser
          users.push(simpleUser as unknown as ExtendedUser);
        });
        
        console.log("Direct Firebase search results:", users);
        
        if (users.length === 0) {
          // Fall back to context-provided search function as backup
          const contextUsers = await searchUsers(searchQuery);
          setResults(contextUsers);
        } else {
          setResults(users);
        }
      } catch (error) {
        console.error("Error searching users:", error);
        // Attempt fallback search method
        try {
          const contextUsers = await searchUsers(searchQuery);
          setResults(contextUsers);
        } catch (innerError) {
          console.error("Fallback search also failed:", innerError);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(handleSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, searchUsers]);

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

  const handleUserSelect = async (user: ExtendedUser) => {
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
                        <div className="text-xs text-muted-foreground">@{user.username || user.displayName}</div>
                      </div>
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          ) : searchQuery.length >= 2 ? (
            <div className="p-3 text-center text-muted-foreground">
              No users found
            </div>
          ) : (
            <div className="p-3 text-center text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchUsers;
