import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageReactionsProps {
  messageId: string;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'];

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasReacted: boolean;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({ messageId }) => {
  const { currentUser } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetchReactions();

    // Subscribe to reaction changes
    const channel = supabase
      .channel(`reactions:${messageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
          filter: `message_id=eq.${messageId}`
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const fetchReactions = async () => {
    const { data, error } = await supabase
      .from('message_reactions')
      .select('emoji, user_id')
      .eq('message_id', messageId);

    if (error || !data) return;

    // Group reactions by emoji
    const grouped = data.reduce((acc: any, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = { emoji: r.emoji, users: [], count: 0, hasReacted: false };
      }
      acc[r.emoji].users.push(r.user_id);
      acc[r.emoji].count++;
      if (r.user_id === currentUser?.uid) {
        acc[r.emoji].hasReacted = true;
      }
      return acc;
    }, {});

    setReactions(Object.values(grouped));
  };

  const handleReaction = async (emoji: string) => {
    if (!currentUser) return;

    const existingReaction = reactions.find(r => r.emoji === emoji && r.hasReacted);

    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', currentUser.uid)
        .eq('emoji', emoji);
    } else {
      // Add reaction
      await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: currentUser.uid,
          emoji
        });
    }

    setShowPicker(false);
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      {/* Existing reactions */}
      {reactions.map(reaction => (
        <Button
          key={reaction.emoji}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 px-2 rounded-full text-xs",
            reaction.hasReacted && "bg-primary/10 border border-primary/30"
          )}
          onClick={() => handleReaction(reaction.emoji)}
        >
          <span>{reaction.emoji}</span>
          {reaction.count > 1 && (
            <span className="ml-1 text-muted-foreground">{reaction.count}</span>
          )}
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 rounded-full">
            <Smile className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {QUICK_EMOJIS.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:scale-110 transition-transform"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MessageReactions;
