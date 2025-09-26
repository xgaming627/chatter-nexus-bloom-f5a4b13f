import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Image, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GifResult {
  id: string;
  url: string;
  preview: string;
  title: string;
}

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
}

const GifPicker: React.FC<GifPickerProps> = ({ onGifSelect }) => {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Search GIFs using Supabase edge function
  const searchGifs = async (query: string) => {
    if (!query.trim()) {
      setGifs([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('search-gifs', {
        body: { searchTerm: query, limit: 20 }
      });

      if (error) {
        throw error;
      }

      if (data?.gifs) {
        setGifs(data.gifs);
      } else {
        setGifs([]);
      }
    } catch (error) {
      console.error('Error searching GIFs:', error);
      toast({
        title: "Error",
        description: "Failed to search GIFs. Please try again.",
        variant: "destructive"
      });
      setGifs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (search.trim()) {
        searchGifs(search);
      } else {
        setGifs([]);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [search]);

  const handleGifClick = (gifUrl: string) => {
    onGifSelect(gifUrl);
    setIsOpen(false);
    setSearch('');
    setGifs([]);
  };

  const handleTenorLinkDetection = (text: string) => {
    // Check if text contains a Tenor link
    const tenorRegex = /https?:\/\/(www\.)?tenor\.com\/view\/[^\s]+/g;
    const matches = text.match(tenorRegex);
    return matches ? matches[0] : null;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" type="button">
          <Image className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for GIFs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <ScrollArea className="h-64">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-pulse">Searching GIFs...</div>
            </div>
          ) : gifs.length > 0 ? (
            <div className="p-2 grid grid-cols-2 gap-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  onClick={() => handleGifClick(gif.url)}
                  className="aspect-square bg-muted rounded overflow-hidden hover:opacity-80 transition-opacity"
                  title={gif.title}
                >
                  <img
                    src={gif.preview}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : search.trim() ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No GIFs found for "{search}"
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <div className="mb-2">🎬 Search for GIFs</div>
              <div className="text-xs">
                Type to search for animated GIFs or paste Tenor links directly in your messages.
              </div>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default GifPicker;