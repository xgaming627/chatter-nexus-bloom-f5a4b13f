import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, conversationHistory, imageUrl, currentUserId, userProfiles } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    // Build conversation history for Groq with proper attribution
    const messages: { role: string; content: string }[] = [
      {
        role: 'system',
        content: 'You are Nexus AI, a helpful and friendly AI assistant integrated into the Nexus Chat platform. You help users with questions, provide information, and engage in natural conversations. Be concise, helpful, and friendly. When users mention other people using @username format, acknowledge them appropriately.'
      }
    ];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      for (const msg of conversationHistory) {
        const senderProfile = userProfiles?.find((p: any) => p.user_id === msg.sender_id);
        const senderName = senderProfile?.username || 'unknown';
        const isCurrentUser = msg.sender_id === currentUserId;
        const isGemini = msg.sender_id === '00000000-0000-0000-0000-000000000003';
        
        if (isGemini) {
          messages.push({
            role: 'assistant',
            content: msg.content
          });
        } else {
          // Format message with attribution
          const attribution = isCurrentUser ? '[You]' : `@${senderName}`;
          messages.push({
            role: 'user',
            content: `${attribution}: ${msg.content}`
          });
        }
      }
    }

    // Add current message
    let currentContent = message;
    if (imageUrl) {
      currentContent += '\n[Note: An image was attached but I cannot process images in this mode.]';
    }
    
    messages.push({
      role: 'user',
      content: currentContent
    });

    console.log('Sending request to Groq API with', messages.length, 'messages...');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemma2-9b-it',
        messages,
        temperature: 0.9,
        max_tokens: 2048,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Groq response received');

    const generatedText = data.choices?.[0]?.message?.content || 
                         'Sorry, I could not generate a response.';

    return new Response(
      JSON.stringify({ response: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in gemini-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
