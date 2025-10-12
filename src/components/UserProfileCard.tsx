import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useRole } from '@/hooks/useRole';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import UserAvatar from './UserAvatar';
import { Shield, Crown, AlertTriangle, UserX, UserCheck, Copy, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UserProfileCardProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  isBlocked?: boolean;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({
  userId,
  open,
  onOpenChange,
  onBlock,
  onUnblock,
  isBlocked = false
}) => {
  const { currentUser } = useAuth();
  const { isModerator } = useRole();
  const [profile, setProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [mutualConversations, setMutualConversations] = useState(0);
  const [isIgnored, setIsIgnored] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    if (open && userId) {
      fetchUserProfile();
      checkIgnoreStatus();
    }
  }, [open, userId]);

  const fetchUserProfile = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .contains('participants', [currentUser?.uid, userId]);

    setProfile(profileData);
    setUserRoles(rolesData || []);
    setMutualConversations(conversations?.length || 0);
  };

  const checkIgnoreStatus = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('ignored_users')
      .select('id')
      .eq('user_id', currentUser.uid)
      .eq('ignored_user_id', userId)
      .single();
    setIsIgnored(!!data);
  };

  const handleIgnore = async () => {
    if (!currentUser) return;
    if (isIgnored) {
      await supabase
        .from('ignored_users')
        .delete()
        .eq('user_id', currentUser.uid)
        .eq('ignored_user_id', userId);
      setIsIgnored(false);
      toast({ title: 'User unignored' });
    } else {
      await supabase
        .from('ignored_users')
        .insert({ user_id: currentUser.uid, ignored_user_id: userId });
      setIsIgnored(true);
      toast({ title: 'User ignored', description: 'You will not receive notifications from this user' });
    }
  };

  const handleReportProfile = async () => {
    if (!currentUser || !reportReason.trim()) return;
    
    await supabase.from('reported_profiles').insert({
      reported_user_id: userId,
      reported_by: currentUser.uid,
      reason: reportReason,
      saved_username: profile.username,
      saved_display_name: profile.display_name,
      saved_photo_url: profile.photo_url,
      saved_description: profile.description,
      saved_banner_color: profile.banner_color,
      saved_banner_image_url: profile.banner_image_url
    });

    toast({ title: 'Profile reported', description: 'Moderators will review this profile' });
    setShowReportDialog(false);
    setReportReason('');
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    toast({ title: 'User ID copied' });
  };

  if (!profile) return null;

  const isNexusPlus = profile.nexus_plus_active;
  const isAdmin = userRoles.some(r => r.role === 'admin');
  const isMod = userRoles.some(r => r.role === 'moderator');
  const bannerStyle = profile.banner_image_url 
    ? { backgroundImage: `url(${profile.banner_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: profile.banner_color || '#1a1b26' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Banner */}
        <div className="h-24 w-full" style={bannerStyle} />
        
        {/* Avatar overlapping banner */}
        <div className="px-4 -mt-10">
          <UserAvatar
            username={profile.username}
            photoURL={profile.photo_url}
            size="xl"
            isNexusPlus={isNexusPlus}
            userRole={isAdmin ? 'admin' : isMod ? 'moderator' : 'user'}
            showRoleBadge={true}
          />
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-4">
          {/* Username and badges */}
          <div>
            <div className="flex items-center gap-2">
              <h2 className={cn(
                "text-xl font-bold flex items-center gap-2",
                isNexusPlus && "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500",
                isAdmin && "text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500"
              )}>
                {profile.display_name || profile.username}
                {isNexusPlus && <Crown className="h-5 w-5 text-yellow-500" />}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {(isAdmin || isMod) && (
              <div className="flex gap-2 mt-1">
                {isAdmin && (
                  <Badge className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                    <Shield className="h-3 w-3 mr-1" /> Owner
                  </Badge>
                )}
                {isMod && !isAdmin && (
                  <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    <Shield className="h-3 w-3 mr-1" /> Moderator
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* About Me */}
          {profile.description && (
            <div>
              <h3 className="text-sm font-semibold mb-1">About Me</h3>
              <p className="text-sm text-muted-foreground">{profile.description}</p>
            </div>
          )}

          <Separator />

          {/* Member Since */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Member Since</h3>
            <p className="text-sm text-muted-foreground">
              {format(new Date(profile.created_at), 'MMM dd, yyyy')}
            </p>
          </div>

          {/* Mutual Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Mutual Conversations</span>
            </div>
            <span className="font-semibold">{mutualConversations}</span>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleIgnore}
            >
              {isIgnored ? (
                <>
                  <UserCheck className="h-4 w-4 mr-2" /> Unignore
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" /> Ignore
                </>
              )}
            </Button>

            {onBlock && (
              <Button
                variant={isBlocked ? "outline" : "destructive"}
                className="w-full"
                onClick={isBlocked ? onUnblock : onBlock}
              >
                <UserX className="h-4 w-4 mr-2" />
                {isBlocked ? 'Unblock' : 'Block'}
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full text-orange-600"
              onClick={() => setShowReportDialog(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" /> Report User Profile
            </Button>

            <Button variant="ghost" className="w-full" onClick={copyUserId}>
              <Copy className="h-4 w-4 mr-2" /> Copy User ID
            </Button>
          </div>
        </div>

        {/* Report Dialog */}
        {showReportDialog && (
          <div className="absolute inset-0 bg-background p-4 flex flex-col">
            <h3 className="font-semibold mb-2">Report User Profile</h3>
            <textarea
              className="flex-1 p-2 border rounded resize-none"
              placeholder="Explain why you're reporting this profile..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleReportProfile} disabled={!reportReason.trim()}>
                Submit Report
              </Button>
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileCard;