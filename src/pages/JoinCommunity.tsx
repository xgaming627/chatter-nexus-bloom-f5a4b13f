import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function JoinCommunity() {
  const { customLink } = useParams<{ customLink: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<any>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!customLink) {
      navigate('/');
      return;
    }
    fetchCommunity();
  }, [customLink]);

  const fetchCommunity = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .eq('custom_link', customLink)
      .single();

    if (error || !data) {
      toast({
        title: 'Community Not Found',
        description: 'This community does not exist or the link is invalid.',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }

    setCommunity(data);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!currentUser || !community) return;

    setJoining(true);
    try {
      // Check if already a member
      const { data: existing } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', community.id)
        .eq('user_id', currentUser.uid)
        .single();

      if (existing) {
        toast({
          title: 'Already a Member',
          description: 'You are already a member of this community!'
        });
        navigate('/');
        return;
      }

      // Add user to community
      await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: currentUser.uid,
          role: 'member'
        });

      // Add user to conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('participants')
        .eq('id', community.conversation_id)
        .single();

      if (conv) {
        const newParticipants = [...(conv.participants || []), currentUser.uid];
        await supabase
          .from('conversations')
          .update({ participants: newParticipants })
          .eq('id', community.conversation_id);
      }

      toast({
        title: 'Joined Successfully!',
        description: `You are now a member of ${community.name}`
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error joining community:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to join community',
        variant: 'destructive'
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>{community?.name}</CardTitle>
          <CardDescription>{community?.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button onClick={handleJoin} disabled={joining || !currentUser}>
            {joining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              'Join Community'
            )}
          </Button>
          {!currentUser && (
            <p className="text-sm text-muted-foreground text-center">
              You must be logged in to join
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
