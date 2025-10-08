// Special conversation IDs
export const NEWS_CONVERSATION_ID = '00000000-0000-0000-0000-000000000001';
export const COMMUNITY_CONVERSATION_ID = '00000000-0000-0000-0000-000000000002';

// Check if conversation is a special system conversation
export const isSpecialConversation = (conversationId: string | undefined): boolean => {
  return conversationId === NEWS_CONVERSATION_ID || conversationId === COMMUNITY_CONVERSATION_ID;
};

export const isNewsConversation = (conversationId: string | undefined): boolean => {
  return conversationId === NEWS_CONVERSATION_ID;
};

export const isCommunityConversation = (conversationId: string | undefined): boolean => {
  return conversationId === COMMUNITY_CONVERSATION_ID;
};
