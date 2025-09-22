import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    // Get IP address (considering various proxy headers)
    const realIP = req.headers.get('x-real-ip') || 
                   req.headers.get('x-forwarded-for')?.split(',')[0] || 
                   req.headers.get('x-client-ip') ||
                   'Unknown';

    // Get user agent
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    // Get location data from IP (using a free IP geolocation service)
    let location = 'Unknown Location';
    let city = 'Unknown';
    let country = 'Unknown';

    try {
      if (realIP !== 'Unknown' && !realIP.startsWith('127.') && !realIP.startsWith('192.168.')) {
        const geoResponse = await fetch(`http://ip-api.com/json/${realIP}`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.status === 'success') {
            city = geoData.city || 'Unknown';
            country = geoData.country || 'Unknown';
            location = `${city}, ${country}`;
          }
        }
      } else {
        // Local/private IP
        location = 'Local Network';
        city = 'Local';
        country = 'Local';
      }
    } catch (error) {
      console.error('Error fetching geolocation:', error);
      // Keep default values
    }

    // Insert login session record
    const { error: insertError } = await supabase
      .from('login_sessions')
      .insert({
        user_id: user.id,
        ip_address: realIP,
        user_agent: userAgent,
        location: location,
        city: city,
        country: country
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        session: {
          ip_address: realIP,
          location: location,
          user_agent: userAgent
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error tracking login:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to track login session',
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
