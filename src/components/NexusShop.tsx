import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sparkles, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  item_type: string;
  item_data: any;
  is_active: boolean;
}

interface UserPoints {
  points: number;
}

export const NexusShop = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchShopData();
    }
  }, [currentUser]);

  const fetchShopData = async () => {
    if (!currentUser) return;

    try {
      const { data: itemsData } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .order('price');

      setItems(itemsData || []);

      const { data: pointsData } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', currentUser.uid)
        .single();

      setUserPoints(pointsData || { points: 0 });

      const { data: purchasedData } = await supabase
        .from('purchased_items')
        .select('shop_item_id')
        .eq('user_id', currentUser.uid);

      setPurchased(new Set(purchasedData?.map(p => p.shop_item_id) || []));
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (!currentUser || !userPoints) return;

    if (userPoints.points < item.price) {
      toast({
        title: 'Insufficient Points',
        description: `You need ${item.price - userPoints.points} more points to purchase this item.`,
        variant: 'destructive'
      });
      return;
    }

    try {
      // Deduct points
      const { error: pointsError } = await supabase
        .from('user_points')
        .update({ points: userPoints.points - item.price })
        .eq('user_id', currentUser.uid);

      if (pointsError) throw pointsError;

      // Add purchase
      const { error: purchaseError } = await supabase
        .from('purchased_items')
        .insert({
          user_id: currentUser.uid,
          shop_item_id: item.id,
          is_active: true
        });

      if (purchaseError) throw purchaseError;

      toast({
        title: 'Purchase Successful!',
        description: `You purchased ${item.name}`,
      });

      fetchShopData();
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: 'There was an error processing your purchase.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading shop...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Nexus Shop
            </h1>
            <p className="text-muted-foreground mt-2">Customize your profile with exclusive items</p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-6 py-3 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-2xl font-bold">{userPoints?.points || 0}</span>
            <span className="text-sm text-muted-foreground">Points</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => {
          const isPurchased = purchased.has(item.id);
          const canAfford = (userPoints?.points || 0) >= item.price;

          return (
            <Card key={item.id} className={cn(
              "p-6 transition-all hover:shadow-lg",
              isPurchased && "border-primary"
            )}>
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg mb-4 flex items-center justify-center">
                <div className="text-6xl">
                  {item.item_type === 'avatar_frame' && '🖼️'}
                  {item.item_type === 'profile_effect' && '✨'}
                  {item.item_type === 'badge' && '🏅'}
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-bold">{item.price}</span>
                </div>

                {isPurchased ? (
                  <Badge variant="secondary">Owned</Badge>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handlePurchase(item)}
                    disabled={!canAfford}
                    className="gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Buy
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
