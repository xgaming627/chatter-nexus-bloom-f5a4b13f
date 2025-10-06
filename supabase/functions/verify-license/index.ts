import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licenseKey } = await req.json();
    
    if (!licenseKey) {
      return new Response(
        JSON.stringify({ error: 'License key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payhipKey = Deno.env.get('PAYHIP_SECRET_KEY');
    if (!payhipKey) {
      console.error('PAYHIP_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify with Payhip API
    const payhipResponse = await fetch('https://payhip.com/api/v1/license/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'payhip-secret-key': payhipKey,
      },
      body: JSON.stringify({ product_link: 'ck6Id', license_key: licenseKey }),
    });

    const payhipData = await payhipResponse.json();
    console.log('Payhip verification response:', payhipData);

    if (!payhipData.success || payhipData.status !== 'valid') {
      return new Response(
        JSON.stringify({ error: 'Invalid or already used license key', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if key already used
    const { data: existingKey } = await supabase
      .from('license_keys')
      .select('*')
      .eq('key_code', licenseKey)
      .single();

    if (existingKey) {
      return new Response(
        JSON.stringify({ error: 'License key already used', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current user profile to check existing Nexus Plus status
    const { data: profile } = await supabase
      .from('profiles')
      .select('nexus_plus_active, nexus_plus_expires_at')
      .eq('user_id', user.id)
      .single();

    // Calculate expiry (3 months from now or from existing expiry if active)
    let expiresAt = new Date();
    if (profile?.nexus_plus_active && profile.nexus_plus_expires_at) {
      // Stack license - add 3 months to existing expiry
      expiresAt = new Date(profile.nexus_plus_expires_at);
      expiresAt.setMonth(expiresAt.getMonth() + 3);
      console.log('Stacking license: extending from', profile.nexus_plus_expires_at, 'to', expiresAt.toISOString());
    } else {
      // New license - 3 months from now
      expiresAt.setMonth(expiresAt.getMonth() + 3);
    }

    // Store license key
    const { error: insertError } = await supabase
      .from('license_keys')
      .insert({
        key_code: licenseKey,
        user_id: user.id,
        activated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        is_active: true,
      });

    if (insertError) {
      console.error('Error storing license key:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to activate license' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user profile with Nexus Plus
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        nexus_plus_active: true,
        nexus_plus_expires_at: expiresAt.toISOString(),
        nexus_plus_reminder_shown: false,
      })
      .eq('user_id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Nexus Plus activated successfully!',
        expiresAt: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-license function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});