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

    // Make request to Tenor API
    const tenorUrl = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchTerm)}&key=${TENOR_API_KEY}&limit=${limit}&media_filter=gif`;
    
    const response = await fetch(tenorUrl);
    
    if (!response.ok) {
      throw new Error(`Tenor API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform Tenor API response to match our interface
    const gifs = data.results?.map((gif: any) => ({
      id: gif.id,
      url: gif.media_formats.gif.url,
      preview: gif.media_formats.tinygif.url,
      title: gif.content_description || `GIF for ${searchTerm}`,
      width: gif.media_formats.gif.dims[0],
      height: gif.media_formats.gif.dims[1]
    })) || [];

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