-- Create tables for WebRTC call signaling
CREATE TABLE public.call_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL UNIQUE,
  caller_id UUID NOT NULL,
  callee_id UUID,
  conversation_id UUID,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'ringing', 'active', 'ended')),
  offer JSONB,
  answer JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for ICE candidates
CREATE TABLE public.ice_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  candidate JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.call_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ice_candidates ENABLE ROW LEVEL SECURITY;

-- Create policies for call_rooms
CREATE POLICY "Users can view rooms they participate in" 
ON public.call_rooms 
FOR SELECT 
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create call rooms" 
ON public.call_rooms 
FOR INSERT 
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update rooms they participate in" 
ON public.call_rooms 
FOR UPDATE 
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Create policies for ice_candidates
CREATE POLICY "Users can view ICE candidates for their rooms" 
ON public.ice_candidates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.call_rooms 
    WHERE room_id = ice_candidates.room_id 
    AND (caller_id = auth.uid() OR callee_id = auth.uid())
  )
);

CREATE POLICY "Users can insert ICE candidates for their rooms" 
ON public.ice_candidates 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.call_rooms 
    WHERE room_id = ice_candidates.room_id 
    AND (caller_id = auth.uid() OR callee_id = auth.uid())
  )
);

-- Create trigger for auto-updating timestamps
CREATE TRIGGER update_call_rooms_updated_at
BEFORE UPDATE ON public.call_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_call_rooms_room_id ON public.call_rooms(room_id);
CREATE INDEX idx_call_rooms_caller_id ON public.call_rooms(caller_id);
CREATE INDEX idx_call_rooms_callee_id ON public.call_rooms(callee_id);
CREATE INDEX idx_ice_candidates_room_id ON public.ice_candidates(room_id);

-- Enable realtime for call signaling
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ice_candidates;