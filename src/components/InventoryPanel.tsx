import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Package, Star, Palette, Frame, Crown } from "lucide-react";

interface InventoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ open, onOpenChange }) => {
  const { currentUser } = useAuth();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState<any>(null);

  useEffect(() => {
    if (open && currentUser) {
      fetchInventory();
      fetchUserLevel();
    }
  }, [open, currentUser]);

  const fetchInventory = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    const { data } = await supabase
      .from('user_inventory')
      .select('*')
      .eq('user_id', currentUser.uid)
      .order('acquired_at', { ascending: false });
    
    setInventory(data || []);
    setLoading(false);
  };

  const fetchUserLevel = async () => {
    if (!currentUser) return;
    
    const { data } = await supabase
      .from('user_levels')
      .select('*')
      .eq('user_id', currentUser.uid)
      .single();
    
    setUserLevel(data);
  };

  const handleEquipItem = async (itemId: string, itemType: string) => {
    if (!currentUser) return;

    try {
      // Unequip all items of the same type
      await supabase
        .from('user_inventory')
        .update({ equipped: false })
        .eq('user_id', currentUser.uid)
        .eq('item_type', itemType);

      // Equip the selected item
      const { error } = await supabase
        .from('user_inventory')
        .update({ equipped: true })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Item Equipped!",
        description: "Your new item is now active."
      });

      fetchInventory();
    } catch (error: any) {
      console.error('Error equipping item:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to equip item.",
        variant: "destructive"
      });
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'title': return <Crown className="h-4 w-4" />;
      case 'decoration': return <Star className="h-4 w-4" />;
      case 'theme': return <Palette className="h-4 w-4" />;
      case 'border': return <Frame className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const groupByType = (items: any[]) => {
    return items.reduce((acc, item) => {
      if (!acc[item.item_type]) {
        acc[item.item_type] = [];
      }
      acc[item.item_type].push(item);
      return acc;
    }, {} as Record<string, any[]>);
  };

  const groupedInventory = groupByType(inventory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Nexus Inventory
          </DialogTitle>
        </DialogHeader>

        {userLevel && (
          <div className="bg-primary/10 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">Level {userLevel.level}</h3>
                {userLevel.equipped_title && (
                  <Badge variant="secondary">{userLevel.equipped_title}</Badge>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">XP Progress</p>
                <p className="font-semibold">{userLevel.xp} / {100 * userLevel.level * userLevel.level}</p>
              </div>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(userLevel.xp / (100 * userLevel.level * userLevel.level)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="title">Titles</TabsTrigger>
            <TabsTrigger value="decoration">Decorations</TabsTrigger>
            <TabsTrigger value="theme">Themes</TabsTrigger>
            <TabsTrigger value="border">Borders</TabsTrigger>
            <TabsTrigger value="background">Backgrounds</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="all" className="space-y-6">
              {loading ? (
                <div className="text-center py-8">Loading inventory...</div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Your inventory is empty</p>
                  <p className="text-sm">Complete challenges and level up to earn items!</p>
                </div>
              ) : (
                Object.entries(groupedInventory).map(([type, items]: [string, any[]]) => (
                  <div key={type}>
                    <h3 className="font-semibold mb-3 capitalize flex items-center gap-2">
                      {getItemIcon(type)}
                      {type}s ({items.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {items.map((item: any) => (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-3 ${item.equipped ? 'border-primary bg-primary/5' : ''}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-medium text-sm">{item.item_data.name}</p>
                            {item.equipped && <Badge variant="default">Equipped</Badge>}
                          </div>
                          {item.item_data.description && (
                            <p className="text-xs text-muted-foreground mb-2">{item.item_data.description}</p>
                          )}
                          {!item.equipped && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handleEquipItem(item.id, item.item_type)}
                            >
                              Equip
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            {['title', 'decoration', 'theme', 'border', 'background'].map((type) => (
              <TabsContent key={type} value={type}>
                {groupedInventory[type] && groupedInventory[type].length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {groupedInventory[type].map((item: any) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-3 ${item.equipped ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-sm">{item.item_data.name}</p>
                          {item.equipped && <Badge variant="default">Equipped</Badge>}
                        </div>
                        {item.item_data.description && (
                          <p className="text-xs text-muted-foreground mb-2">{item.item_data.description}</p>
                        )}
                        {!item.equipped && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleEquipItem(item.id, item.item_type)}
                          >
                            Equip
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No {type}s in inventory</p>
                  </div>
                )}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};