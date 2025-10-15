import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gift, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  group_name: string | null;
  is_group_chat: boolean;
}

const NexusGiftPanel: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string>('');
  const [months, setMonths] = useState<number>(1);
  const [giftLink, setGiftLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('id, group_name, is_group_chat')
      .order('created_at', { ascending: false });

    setConversations(data || []);
  };

  const generateGiftLink = () => {
    if (!selectedConversation || months < 1) {
      toast({
        title: 'Invalid Input',
        description: 'Please select a conversation and enter months (1-12).',
        variant: 'destructive'
      });
      return;
    }

    // Generate a unique gift code
    const giftCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const link = `${window.location.origin}/gift/${giftCode}?months=${months}&conversation=${selectedConversation}`;
    
    setGiftLink(link);
    
    toast({
      title: 'Gift Link Generated!',
      description: 'Copy and share the link with the recipient.',
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(giftLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: 'Gift link copied to clipboard.',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-yellow-500" />
          Gift Nexus Plus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select Conversation</Label>
          <Select value={selectedConversation} onValueChange={setSelectedConversation}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a conversation" />
            </SelectTrigger>
            <SelectContent>
              {conversations.map((conv) => (
                <SelectItem key={conv.id} value={conv.id}>
                  {conv.is_group_chat ? conv.group_name : 'Direct Message'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Months (1-12)</Label>
          <Input
            type="number"
            min="1"
            max="12"
            value={months}
            onChange={(e) => setMonths(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
          />
        </div>

        <Button onClick={generateGiftLink} className="w-full">
          Generate Gift Link
        </Button>

        {giftLink && (
          <div className="space-y-2 p-4 bg-muted rounded-md">
            <Label>Gift Link (Click to Copy)</Label>
            <div className="flex gap-2">
              <Input value={giftLink} readOnly className="flex-1" />
              <Button size="icon" variant="outline" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link in the conversation to gift {months} month{months > 1 ? 's' : ''} of Nexus Plus
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NexusGiftPanel;
