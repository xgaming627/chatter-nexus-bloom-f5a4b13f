import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smile } from 'lucide-react';

// Common emoji categories
const emojiCategories = {
  smileys: {
    name: 'Smileys & People',
    emojis: {
      's': '😊', 'smile': '😊', 'happy': '😊', 'grin': '😁', 'joy': '😄',
      'laugh': '😂', 'lol': '😂', 'cry-laugh': '😂', 'rofl': '🤣', 'sweat': '😅',
      'heart': '❤️', 'love': '❤️', 'heart-eyes': '😍', 'kiss': '😘', 'blush': '😊',
      'wink': '😉', 'cool': '😎', 'smirk': '😏', 'neutral': '😐', 'expressionless': '😑',
      'think': '🤔', 'thinking': '🤔', 'confused': '😕', 'worried': '😟', 'frown': '☹️',
      'thumbs-up': '👍', 'thumbs-down': '👎', 'fist': '✊', 'victory': '✌️', 'fingers-crossed': '🤞',
      'clap': '👏', 'fire': '🔥', 'star': '⭐', 'sparkles': '✨', '100': '💯',
      'ok': '👌', 'peace': '✌️', 'point-up': '👆', 'point-down': '👇', 'point-left': '👈', 'point-right': '👉',
      'wave': '👋', 'hi': '👋', 'pray': '🙏', 'muscle': '💪', 'selfie': '🤳',
      'sad': '😢', 'cry': '😭', 'sob': '😭', 'angry': '😡', 'rage': '😠', 'mad': '🤬',
      'surprised': '😮', 'shock': '😱', 'wow': '😲', 'open-mouth': '😮', 'gasp': '😯',
      'sick': '🤒', 'dizzy': '😵', 'tired': '😴', 'sleepy': '😪', 'yawn': '🥱',
      'nerd': '🤓', 'glasses': '😎', 'monocle': '🧐', 'cowboy': '🤠', 'party': '🥳'
    }
  },
  objects: {
    name: 'Objects',
    emojis: {
      'phone': '📱', 'computer': '💻', 'laptop': '💻', 'desktop': '🖥️', 'keyboard': '⌨️',
      'car': '🚗', 'truck': '🚚', 'bus': '🚌', 'plane': '✈️', 'rocket': '🚀',
      'home': '🏠', 'house': '🏡', 'office': '🏢', 'school': '🏫', 'hospital': '🏥',
      'book': '📚', 'notebook': '📔', 'pen': '✏️', 'pencil': '✏️', 'marker': '🖊️',
      'clock': '🕐', 'calendar': '📅', 'watch': '⌚', 'timer': '⏰', 'hourglass': '⏳',
      'money': '💰', 'dollar': '💵', 'credit-card': '💳', 'gem': '💎', 'gift': '🎁',
      'camera': '📷', 'video': '📹', 'tv': '📺', 'radio': '📻', 'headphones': '🎧',
      'guitar': '🎸', 'piano': '🎹', 'microphone': '🎤', 'trumpet': '🎺', 'violin': '🎻',
      'soccer': '⚽', 'basketball': '🏀', 'football': '🏈', 'tennis': '🎾', 'ping-pong': '🏓'
    }
  },
  nature: {
    name: 'Nature',
    emojis: {
      'sun': '☀️', 'moon': '🌙', 'crescent': '🌙', 'full-moon': '🌕', 'new-moon': '🌑',
      'star': '⭐', 'stars': '✨', 'cloud': '☁️', 'cloudy': '⛅', 'storm': '⛈️',
      'rain': '🌧️', 'drizzle': '🌦️', 'snow': '❄️', 'snowman': '⛄', 'thunder': '⚡',
      'tree': '🌳', 'evergreen': '🌲', 'palm': '🌴', 'cactus': '🌵', 'leaves': '🍃',
      'flower': '🌸', 'rose': '🌹', 'tulip': '🌷', 'sunflower': '🌻', 'blossom': '🌼',
      'cat': '🐱', 'dog': '🐶', 'mouse': '🐭', 'hamster': '🐹', 'rabbit': '🐰',
      'fox': '🦊', 'bear': '🐻', 'panda': '🐼', 'koala': '🐨', 'tiger': '🐯',
      'lion': '🦁', 'cow': '🐮', 'pig': '🐷', 'monkey': '🐵', 'chicken': '🐔',
      'penguin': '🐧', 'bird': '🐦', 'eagle': '🦅', 'duck': '🦆', 'owl': '🦉',
      'frog': '🐸', 'snake': '🐍', 'turtle': '🐢', 'fish': '🐠', 'whale': '🐋'
    }
  },
  food: {
    name: 'Food & Drink',
    emojis: {
      'apple': '🍎', 'banana': '🍌', 'orange': '🍊', 'strawberry': '🍓', 'grapes': '🍇',
      'watermelon': '🍉', 'pineapple': '🍍', 'peach': '🍑', 'cherry': '🍒', 'lemon': '🍋',
      'bread': '🍞', 'croissant': '🥐', 'bagel': '🥯', 'pretzel': '🥨', 'pancakes': '🥞',
      'pizza': '🍕', 'burger': '🍔', 'fries': '🍟', 'hotdog': '🌭', 'taco': '🌮',
      'coffee': '☕', 'tea': '🍵', 'beer': '🍺', 'wine': '🍷', 'cocktail': '🍹',
      'cake': '🍰', 'cupcake': '🧁', 'cookie': '🍪', 'donut': '🍩', 'chocolate': '🍫',
      'ice-cream': '🍦', 'popsicle': '🍭', 'candy': '🍬', 'honey': '🍯', 'popcorn': '🍿'
    }
  },
  activities: {
    name: 'Activities',
    emojis: {
      'party': '🎉', 'confetti': '🎊', 'balloon': '🎈', 'birthday': '🎂', 'celebrate': '🥳',
      'dance': '💃', 'man-dancing': '🕺', 'music': '🎵', 'note': '🎶', 'headphones': '🎧',
      'art': '🎨', 'paint': '🖌️', 'theater': '🎭', 'movie': '🎬', 'clapper': '🎬',
      'game': '🎮', 'joystick': '🕹️', 'dice': '🎲', 'puzzle': '🧩', 'chess': '♟️',
      'medal': '🏅', 'trophy': '🏆', 'award': '🥇', 'ribbon': '🎗️', 'first': '🥇',
      'travel': '✈️', 'luggage': '🧳', 'map': '🗺️', 'compass': '🧭', 'tent': '⛺'
    }
  }
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  onEmojiSelect, 
  searchQuery = '', 
  onSearchChange 
}) => {
  const [search, setSearch] = useState(searchQuery);
  const [filteredEmojis, setFilteredEmojis] = useState<Array<{ name: string; emoji: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (search.trim()) {
      const allEmojis: Array<{ name: string; emoji: string }> = [];
      
      Object.values(emojiCategories).forEach(category => {
        Object.entries(category.emojis).forEach(([name, emoji]) => {
          if (name.toLowerCase().includes(search.toLowerCase())) {
            allEmojis.push({ name, emoji });
          }
        });
      });
      
      setFilteredEmojis(allEmojis.slice(0, 20)); // Limit to 20 results
    } else {
      setFilteredEmojis([]);
    }
  }, [search]);

  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
    setSearch('');
    onSearchChange?.('');
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange?.(value);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" type="button">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <Input
            placeholder="Search emojis (e.g., :s for smile)"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="text-sm"
          />
        </div>
        
        <ScrollArea className="h-64">
          {search.trim() && filteredEmojis.length > 0 ? (
            <div className="p-2">
              <div className="grid grid-cols-8 gap-1">
                {filteredEmojis.map(({ name, emoji }) => (
                  <button
                    key={name}
                    onClick={() => handleEmojiClick(emoji)}
                    className="p-2 hover:bg-accent rounded text-lg flex items-center justify-center"
                    title={`:${name}:`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : search.trim() ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No emojis found for "{search}"
            </div>
          ) : (
            <div className="p-2">
              {Object.entries(emojiCategories).map(([key, category]) => (
                <div key={key} className="mb-4">
                  <h4 className="text-sm font-medium mb-2 px-2">{category.name}</h4>
                  <div className="grid grid-cols-8 gap-1">
                    {Object.entries(category.emojis).map(([name, emoji]) => (
                      <button
                        key={name}
                        onClick={() => handleEmojiClick(emoji)}
                        className="p-2 hover:bg-accent rounded text-lg flex items-center justify-center"
                        title={`:${name}:`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;