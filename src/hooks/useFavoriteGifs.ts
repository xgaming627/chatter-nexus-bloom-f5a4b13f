import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useFavoriteGifs = (userId: string | null) => {
  const [favoriteGifs, setFavoriteGifs] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchFavoriteGifs = async () => {
      const { data, error } = await supabase
        .from('favorite_gifs')
        .select('*')
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error fetching favorite gifs:', error);
      } else {
        setFavoriteGifs(data || []);
      }
    };

    fetchFavoriteGifs();

    const channel = supabase
      .channel(`favorite_gifs_${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'favorite_gifs',
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchFavoriteGifs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const addFavoriteGif = async (gifUrl: string, gifTitle: string) => {
    if (!userId) return;

    const { error } = await supabase
      .from('favorite_gifs')
      .insert({
        user_id: userId,
        gif_url: gifUrl,
        gif_title: gifTitle,
      });

    if (error) {
      console.error('Error adding favorite gif:', error);
      toast.error("Failed to add favorite");
    } else {
      toast.success("GIF added to favorites");
    }
  };

  const removeFavoriteGif = async (gifUrl: string) => {
    const { error } = await supabase
      .from('favorite_gifs')
      .delete()
      .eq('user_id', userId)
      .eq('gif_url', gifUrl);

    if (error) {
      console.error('Error removing favorite gif:', error);
      toast.error("Failed to remove favorite");
    } else {
      toast.success("GIF removed from favorites");
    }
  };

  const isFavorite = (gifUrl: string) => {
    return favoriteGifs.some(gif => gif.gif_url === gifUrl);
  };

  return { favoriteGifs, addFavoriteGif, removeFavoriteGif, isFavorite };
};