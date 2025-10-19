import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    // Build conversation history for Gemini with proper attribution
    const contents = conversationHistory?.map((msg: any) => {
      // Get sender name from profiles (use username for clarity)
      const senderProfile = userProfiles?.find((p: any) => p.user_id === msg.sender_id);
      const senderName = senderProfile?.username || 'unknown';
      const isCurrentUser = msg.sender_id === currentUserId;
      const isGemini = msg.sender_id === '00000000-0000-0000-0000-000000000003';
      
      // Format message with attribution using @username format
      let textContent = msg.content;
      if (!isGemini) {
        textContent = `${isCurrentUser ? '[You]' : `@${senderName}`}: ${msg.content}`;
      }
      
      const parts: any[] = [{ text: textContent }];
      
      // Add image if present in message
      if (msg.file_url && msg.file_type?.startsWith('image/')) {
        parts.push({
          inlineData: {
            mimeType: msg.file_type,
            data: msg.file_url.split(',')[1] || msg.file_url
          }
        });
      }
      
      return {
        role: isGemini ? 'model' : 'user',
        parts
      };
    }) || [];

    // Build current message parts
    const currentParts: any[] = [{ text: message }];
    
    // Add image if provided in current message
    if (imageUrl) {
      try {
        // Fetch the image and convert to base64
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to fetch image');
        }
        
        const imageBlob = await imageResponse.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        
        currentParts.push({
          inlineData: {
            mimeType: imageBlob.type || 'image/jpeg',
            data: base64
          }
        });
        
        console.log('Image added to request');
      } catch (imageError) {
        console.error('Error processing image:', imageError);
        // Continue without the image
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: currentParts
    });

    console.log('Sending request to Gemini API with', contents.length, 'messages...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response received');

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
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
