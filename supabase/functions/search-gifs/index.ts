import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TENOR_API_KEY = Deno.env.get('TENOR_API_KEY');
    if (!TENOR_API_KEY) {
      throw new Error('TENOR_API_KEY is not set');
    }

    const { searchTerm, limit = 20 } = await req.json();

    if (!searchTerm) {
      return new Response(JSON.stringify({ error: 'Search term is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Searching GIFs for: ${searchTerm}`);

    // Make request to Tenor API - use v1 endpoint which is more stable
    const tenorUrl = `https://api.tenor.com/v1/search?q=${encodeURIComponent(searchTerm)}&key=${TENOR_API_KEY}&limit=${limit}&media_filter=minimal`;
    
    console.log('Making request to Tenor API:', tenorUrl.replace(TENOR_API_KEY, '[HIDDEN]'));
    
    const response = await fetch(tenorUrl);
    
    console.log('Tenor API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Tenor API error details:', errorText);
      throw new Error(`Tenor API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Tenor API response data:', JSON.stringify(data, null, 2));

    // Transform Tenor API response to match our interface
    const gifs = data.results?.map((gif: any) => ({
      id: gif.id,
      url: gif.media[0]?.gif?.url || gif.media[0]?.mp4?.url,
      preview: gif.media[0]?.tinygif?.url || gif.media[0]?.gif?.url,
      title: gif.title || `GIF for ${searchTerm}`,
      width: gif.media[0]?.gif?.dims?.[0] || 200,
      height: gif.media[0]?.gif?.dims?.[1] || 200
    })).filter((gif: any) => gif.url && gif.preview) || [];

    console.log(`Found ${gifs.length} GIFs`);

    return new Response(JSON.stringify({ gifs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error searching GIFs:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to search GIFs' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});