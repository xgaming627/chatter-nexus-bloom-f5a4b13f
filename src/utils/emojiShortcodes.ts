// Emoji shortcode mapping
export const emojiShortcodes: Record<string, string> = {
  ':smile:': '😊',
  ':laughing:': '😆',
  ':joy:': '😂',
  ':sob:': '😭',
  ':heart:': '❤️',
  ':fire:': '🔥',
  ':star:': '⭐',
  ':thumbsup:': '👍',
  ':thumbsdown:': '👎',
  ':clap:': '👏',
  ':wave:': '👋',
  ':eyes:': '👀',
  ':thinking:': '🤔',
  ':sunglasses:': '😎',
  ':cool:': '😎',
  ':wink:': '😉',
  ':angry:': '😠',
  ':sad:': '😢',
  ':neutral:': '😐',
  ':confused:': '😕',
  ':excited:': '🤩',
  ':party:': '🎉',
  ':cake:': '🎂',
  ':gift:': '🎁',
  ':rocket:': '🚀',
  ':100:': '💯',
  ':check:': '✅',
  ':x:': '❌',
  ':warning:': '⚠️',
  ':question:': '❓',
  ':exclamation:': '❗',
  ':zzz:': '💤',
  ':dizzy:': '💫',
  ':boom:': '💥',
  ':sparkles:': '✨',
  ':crown:': '👑',
  ':gem:': '💎',
  ':money:': '💰',
  ':computer:': '💻',
  ':phone:': '📱',
  ':camera:': '📷',
  ':musical_note:': '🎵',
  ':rainbow:': '🌈',
  ':sun:': '☀️',
  ':moon:': '🌙',
  ':pizza:': '🍕',
  ':beer:': '🍺',
  ':coffee:': '☕',
  ':tea:': '🍵'
};

export const replaceShortcodes = (text: string): string => {
  let result = text;
  Object.entries(emojiShortcodes).forEach(([shortcode, emoji]) => {
    result = result.replace(new RegExp(shortcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
  });
  return result;
};
