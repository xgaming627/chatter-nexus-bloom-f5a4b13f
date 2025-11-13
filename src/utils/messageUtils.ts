import { format, isToday, isYesterday, isSameDay } from 'date-fns';

export const MAX_MESSAGE_LENGTH = 500;

export function getDateSeparator(date: Date): string {
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MMMM d, yyyy');
}

export function shouldShowDateSeparator(
  currentMessage: { timestamp: string },
  previousMessage?: { timestamp: string }
): boolean {
  if (!previousMessage) return true;
  
  const currentDate = new Date(currentMessage.timestamp);
  const previousDate = new Date(previousMessage.timestamp);
  
  return !isSameDay(currentDate, previousDate);
}

export function formatMessageTime(timestamp: string): string {
  return format(new Date(timestamp), 'h:mm a');
}

export function validateMessageContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  
  if (content.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` };
  }
  
  return { valid: true };
}
