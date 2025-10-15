import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CustomBadgeCreator: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏆');
  const [color, setColor] = useState('#3b82f6');

  const handleCreate = async () => {
    if (!name.trim() || !description.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Please fill in all fields.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('badge_definitions')
        .insert({
          name: name.trim(),
          description: description.trim(),
          icon,
          color
        });

      if (error) throw error;

      toast({
        title: 'Badge Created!',
        description: `${name} has been added to the system.`,
      });

      // Reset form
      setName('');
      setDescription('');
      setIcon('🏆');
      setColor('#3b82f6');
    } catch (error: any) {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Could not create badge.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create Custom Badge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Badge Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Super Contributor"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this badge represents..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Icon (Emoji)</Label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🏆"
            />
          </div>

          <div className="space-y-2">
            <Label>Color (Hex)</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3b82f6"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-md">
          <p className="text-sm font-medium mb-2">Preview:</p>
          <div className="inline-flex items-center gap-2 p-2 rounded-md" style={{ backgroundColor: color + '20' }}>
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-semibold text-sm">{name || 'Badge Name'}</p>
              <p className="text-xs text-muted-foreground">{description || 'Badge description'}</p>
            </div>
          </div>
        </div>

        <Button onClick={handleCreate} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Create Badge
        </Button>
      </CardContent>
    </Card>
  );
};

export default CustomBadgeCreator;
