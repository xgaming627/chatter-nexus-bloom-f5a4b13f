import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import UserAvatar from './UserAvatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sparkles, UserPlus, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ProfileData {
  user_id: string;
  username: string;
  display_name: string;
  photo_url: string;
  description: string;
  banner_color: string;
  banner_image_url: string;
  nexus_plus_active: boolean;
  created_at: string;
  messages_sent: number;
}

interface BadgeData {
  id: string;
  badge_id: string;
  badge_definitions: {
    name: string;
    description: string;
    icon: string;
    color: string;
  };
}

interface RightSidebarProfileProps {
  userId: string | null;
}

export const RightSidebarProfile = ({ userId }: RightSidebarProfileProps) => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSparkles, setShowSparkles] = useState(false);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'friends'>('none');

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfileData = async () => {
      await fetchProfile();
      await checkFriendStatus();
    };
    
    fetchProfileData();
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      
      // Show sparkles for Nexus Plus users ONLY on initial load
      const shouldShowSparkles = profileData.nexus_plus_active && !profile;
      
      setProfile(profileData);
      
      if (shouldShowSparkles) {
        setShowSparkles(true);
        setTimeout(() => setShowSparkles(false), 3000);
      }

      const { data: badgesData } = await supabase
        .from('user_badges')
        .select(`
          id,
          badge_id,
          badge_definitions (
            name,
            description,
            icon,
            color
          )
        `)
        .eq('user_id', userId);

      setBadges(badgesData || []);

      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      setRoles(rolesData?.map(r => r.role) || []);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFriendStatus = async () => {
    if (!userId || !currentUser || userId === currentUser.uid) {
      setFriendStatus('none');
      return;
    }

    const { data } = await supabase
      .from('friends')
      .select('status')
      .or(`user_id.eq.${currentUser.uid},friend_id.eq.${currentUser.uid}`)
      .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      .single();

    if (data) {
      setFriendStatus(data.status === 'accepted' ? 'friends' : 'pending');
    } else {
      setFriendStatus('none');
    }
  };

  const handleSendFriendRequest = async () => {
    if (!currentUser || !userId) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: currentUser.uid,
          friend_id: userId,
          status: 'pending'
        });

      if (error) throw error;

      setFriendStatus('pending');
      toast({
        title: "Friend request sent!",
        description: "Your friend request has been sent."
      });
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request.",
        variant: "destructive"
      });
    }
  };

  if (!userId || loading) {
    return <div className="w-80 border-l border-border p-4 text-center text-muted-foreground">No user selected</div>;
  }

  if (!profile) return null;

  const bannerStyle = profile.banner_image_url
    ? { backgroundImage: `url(${profile.banner_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: profile.banner_color || '#1a1b26' };

  return (
    <div className="w-80 border-l border-border overflow-y-auto relative">
      {showSparkles && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <Sparkles
              key={i}
              className="absolute text-yellow-400 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      <div className="h-24" style={bannerStyle} />
      
      <div className="p-4 -mt-12">
        <div className="relative inline-block">
          <UserAvatar
            username={profile.username || 'User'}
            photoURL={profile.photo_url || ''}
            size="xl"
            isNexusPlus={profile.nexus_plus_active}
            userRole={roles.includes('admin') ? 'admin' : roles.includes('moderator') ? 'moderator' : 'user'}
            showRoleBadge={true}
          />
          {profile.nexus_plus_active && (
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={cn(
              "font-bold text-xl",
              profile.nexus_plus_active && "bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent"
            )}>
              {profile.display_name || profile.username || 'User'}
            </h3>
            {roles.includes('admin') && (
              <Badge variant="destructive" className="text-xs">Admin</Badge>
            )}
            {roles.includes('moderator') && !roles.includes('admin') && (
              <Badge variant="secondary" className="text-xs">Mod</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username || 'user'}</p>
          
          {currentUser && userId !== currentUser.uid && (
            <div className="mt-3">
              {friendStatus === 'none' && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleSendFriendRequest}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </Button>
              )}
              {friendStatus === 'pending' && (
                <Button size="sm" variant="outline" className="w-full" disabled>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Request Pending
                </Button>
              )}
              {friendStatus === 'friends' && (
                <Button size="sm" variant="outline" className="w-full" disabled>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Friends
                </Button>
              )}
            </div>
          )}
        </div>

        {profile.description && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <p className="text-sm">{profile.description}</p>
          </div>
        )}

        <div className="mt-4 space-y-2">
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Messages Sent</p>
            <p className="text-lg font-bold">{profile.messages_sent || 0}</p>
          </div>
          
          <div className="p-3 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Member Since</p>
            <p className="text-sm">{new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Badges</p>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="group relative cursor-help"
                  title={badge.badge_definitions.description}
                >
                  <div 
                    className="text-2xl p-2 rounded-md transition-transform hover:scale-110"
                    style={{ backgroundColor: badge.badge_definitions.color + '20' }}
                  >
                    {badge.badge_definitions.icon}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-popover text-popover-foreground px-3 py-2 rounded-md shadow-lg text-xs whitespace-nowrap">
                      <div className="font-semibold">{badge.badge_definitions.name}</div>
                      <div className="text-muted-foreground">{badge.badge_definitions.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
