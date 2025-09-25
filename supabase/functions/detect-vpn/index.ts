import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Get user from request
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { sessionId, ipAddress } = await req.json();

    if (!sessionId || !ipAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId or ipAddress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // VPN detection using multiple APIs
    let vpnDetected = false;
    let country = null;
    let city = null;

    try {
      // Try multiple IP info services for better accuracy
      const responses = await Promise.allSettled([
        fetch(`https://ipapi.co/${ipAddress}/json/`),
        fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,query`)
      ]);

      // Parse responses
      for (const response of responses) {
        if (response.status === 'fulfilled' && response.value.ok) {
          const data = await response.value.json();
          
          // Extract location info
          if (data.country && !country) {
            country = data.country;
          }
          if (data.city && !city) {
            city = data.city;
          }

          // VPN/Proxy detection
          if (data.proxy === true || data.hosting === true) {
            vpnDetected = true;
          }

          // Check for VPN indicators in ISP/organization names
          const vpnKeywords = ['vpn', 'proxy', 'datacenter', 'hosting', 'cloud', 'server'];
          const isp = (data.isp || '').toLowerCase();
          const org = (data.org || '').toLowerCase();
          
          if (vpnKeywords.some(keyword => isp.includes(keyword) || org.includes(keyword))) {
            vpnDetected = true;
          }
        }
      }
    } catch (error) {
      console.log('VPN detection APIs failed, continuing without detection:', error);
    }

    // Update support session with detection results
    const { error: updateError } = await supabaseClient
      .from('support_sessions')
      .update({
        vpn_detected: vpnDetected,
        country: country,
        city: city,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        vpnDetected,
        country,
        city,
        sessionId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error processing VPN detection:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to detect VPN',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});