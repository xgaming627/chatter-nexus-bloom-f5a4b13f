import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const GIPHY_API_KEY = Deno.env.get('GIPHY_API_KEY')
    
    if (!GIPHY_API_KEY) {
      console.error('GIPHY_API_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'GIPHY API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const body = await req.json()
    const { searchTerm, limit = 20 } = body
    
    if (!searchTerm) {
      return new Response(
        JSON.stringify({ error: 'Search term is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Searching GIFs for: ${searchTerm}`)
    
    const giphyUrl = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=${limit}&rating=g`
    
    console.log('Making request to GIPHY API...')
    
    const giphyResponse = await fetch(giphyUrl)
    
    if (!giphyResponse.ok) {
      console.error(`GIPHY API error: ${giphyResponse.status} ${giphyResponse.statusText}`)
      const errorText = await giphyResponse.text()
      console.error(`GIPHY API error details: ${errorText}`)
      
      return new Response(
        JSON.stringify({ 
          error: `GIPHY API error: ${giphyResponse.status} ${giphyResponse.statusText}`,
          details: errorText
        }),
        { 
          status: giphyResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const giphyData = await giphyResponse.json()
    console.log(`Found ${giphyData.data?.length || 0} GIFs`)
    
    // Transform GIPHY response to match our expected format
    const gifs = giphyData.data?.map((gif: any) => ({
      id: gif.id,
      url: gif.images.fixed_height.url,
      preview: gif.images.fixed_height_small.url,
      title: gif.title,
      width: parseInt(gif.images.fixed_height.width) || 200,
      height: parseInt(gif.images.fixed_height.height) || 200
    })) || []

    return new Response(
      JSON.stringify({ gifs }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Error searching GIFs:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to search GIFs',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})