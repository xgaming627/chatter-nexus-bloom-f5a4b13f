import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Users, Plus, Crown, Share2, UserMinus, LogOut, Settings } from "lucide-react";

interface CommunitiesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommunitiesPanel: React.FC<CommunitiesPanelProps> = ({ open, onOpenChange }) => {
  const { currentUser } = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCommunity, setNewCommunity] = useState({ name: "", description: "", customLink: "" });
  const [hasNexusPlus, setHasNexusPlus] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && currentUser) {
      fetchCommunities();
      checkNexusPlus();
    }
  }, [open, currentUser]);

  const checkNexusPlus = async () => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('profiles')
      .select('nexus_plus_active')
      .eq('user_id', currentUser.uid)
      .single();
    setHasNexusPlus(data?.nexus_plus_active || false);
  };

  const fetchCommunities = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    // Fetch communities where user is a member
    const { data: memberData } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', currentUser.uid);

    if (memberData && memberData.length > 0) {
      const communityIds = memberData.map(m => m.community_id);
      const { data: communitiesData } = await supabase
        .from('communities')
        .select('*')
        .in('id', communityIds);
      
      setCommunities(communitiesData || []);
    }
    
    setLoading(false);
  };

  const handleCreateCommunity = async () => {
    if (!currentUser || !hasNexusPlus) {
      toast({
        title: "Nexus Plus Required",
        description: "You need Nexus Plus to create communities.",
        variant: "destructive"
      });
      return;
    }

    if (!newCommunity.name || !newCommunity.customLink) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create group chat conversation first
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .insert({
          is_group_chat: true,
          group_name: newCommunity.name,
          created_by: currentUser.uid,
          participants: [currentUser.uid]
        })
        .select()
        .single();

      if (convError) throw convError;

      // Create community
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .insert({
          name: newCommunity.name,
          description: newCommunity.description,
          custom_link: newCommunity.customLink.toLowerCase().replace(/\s/g, '-'),
          owner_id: currentUser.uid,
          conversation_id: convData.id
        })
        .select()
        .single();

      if (communityError) throw communityError;

      // Add creator as owner member
      await supabase
        .from('community_members')
        .insert({
          community_id: communityData.id,
          user_id: currentUser.uid,
          role: 'owner'
        });

      toast({
        title: "Community Created!",
        description: `Your community "${newCommunity.name}" has been created.`
      });

      setShowCreateDialog(false);
      setNewCommunity({ name: "", description: "", customLink: "" });
      fetchCommunities();
    } catch (error: any) {
      console.error('Error creating community:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create community.",
        variant: "destructive"
      });
    }
  };

  const copyJoinLink = (customLink: string) => {
    const link = `${window.location.origin}/join/${customLink}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Community join link copied to clipboard."
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Communities
            {hasNexusPlus && <Badge variant="secondary">Nexus Plus</Badge>}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="text-center py-8">Loading communities...</div>
          ) : communities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No communities yet</p>
              <p className="text-sm">Create or join a community to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {communities.map((community) => (
                <div key={community.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{community.name}</h3>
                        {community.owner_id === currentUser?.uid && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      {community.description && (
                        <p className="text-sm text-muted-foreground mb-2">{community.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyJoinLink(community.custom_link)}
                        >
                          <Share2 className="h-3 w-3 mr-1" />
                          Share Link
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={!hasNexusPlus}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Community
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Create Community Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Community</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Community Name *</Label>
              <Input
                value={newCommunity.name}
                onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                placeholder="My Awesome Community"
              />
            </div>
            
            <div>
              <Label>Description</Label>
              <Textarea
                value={newCommunity.description}
                onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                placeholder="What's your community about?"
                rows={3}
              />
            </div>
            
            <div>
              <Label>Custom Link * (letters, numbers, hyphens)</Label>
              <Input
                value={newCommunity.customLink}
                onChange={(e) => setNewCommunity({ ...newCommunity, customLink: e.target.value })}
                placeholder="my-community"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Join link: /join/{newCommunity.customLink || "your-link"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCommunity}>
              Create Community
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};