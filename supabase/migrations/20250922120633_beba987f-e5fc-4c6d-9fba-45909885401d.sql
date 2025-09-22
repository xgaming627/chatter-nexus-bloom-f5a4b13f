-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.set_warning_expiry()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE NEW.duration
    WHEN '1h' THEN NEW.expires_at = NEW.issued_at + INTERVAL '1 hour';
    WHEN '24h' THEN NEW.expires_at = NEW.issued_at + INTERVAL '24 hours';
    WHEN '7d' THEN NEW.expires_at = NEW.issued_at + INTERVAL '7 days';
    WHEN '30d' THEN NEW.expires_at = NEW.issued_at + INTERVAL '30 days';
    WHEN 'permanent' THEN NEW.expires_at = NEW.issued_at + INTERVAL '100 years';
    ELSE NEW.expires_at = NEW.issued_at + INTERVAL '24 hours';
  END CASE;
  
  RETURN NEW;
END;
$$;

-- Fix get_active_warnings function
CREATE OR REPLACE FUNCTION public.get_active_warnings(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  reason TEXT,
  duration TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  issued_by_name TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.reason,
    w.duration,
    w.issued_at,
    w.expires_at,
    COALESCE(p.display_name, p.username, 'Moderator') as issued_by_name
  FROM public.user_warnings w
  LEFT JOIN public.profiles p ON w.issued_by = p.user_id
  WHERE w.user_id = target_user_id 
    AND w.active = true 
    AND w.expires_at > now()
  ORDER BY w.issued_at DESC;
END;
$$;