-- Create warnings table for proper warning management
CREATE TABLE IF NOT EXISTS public.user_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  issued_by UUID NOT NULL,
  reason TEXT NOT NULL,
  duration TEXT NOT NULL DEFAULT '24h',
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- Create policies for warnings table
CREATE POLICY "Moderators can view all warnings" 
ON public.user_warnings 
FOR SELECT 
USING (
  issued_by IN (
    SELECT user_id FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (
      user_id IN (
        SELECT user_id FROM public.profiles WHERE display_name = 'quiblyservices@gmail.com'
      )
      OR user_id = auth.uid()
    )
  )
);

CREATE POLICY "Moderators can create warnings" 
ON public.user_warnings 
FOR INSERT 
WITH CHECK (
  issued_by = auth.uid() AND
  issued_by IN (
    SELECT user_id FROM public.profiles 
    WHERE display_name = 'quiblyservices@gmail.com'
    OR user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own warnings" 
ON public.user_warnings 
FOR SELECT 
USING (user_id = auth.uid());

-- Create function to automatically set expiry date
CREATE OR REPLACE FUNCTION public.set_warning_expiry()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_warning_expiry_trigger
  BEFORE INSERT ON public.user_warnings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_warning_expiry();

-- Create function to check if user has active warnings
CREATE OR REPLACE FUNCTION public.get_active_warnings(target_user_id UUID)
RETURNS TABLE(
  id UUID,
  reason TEXT,
  duration TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  issued_by_name TEXT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;