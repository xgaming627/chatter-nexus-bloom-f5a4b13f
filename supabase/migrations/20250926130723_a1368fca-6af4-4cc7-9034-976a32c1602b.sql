-- Fix ICE candidates RLS policy - simplify the check
DROP POLICY IF EXISTS "Users can insert ICE candidates for their rooms" ON ice_candidates;

-- Create a more straightforward policy
CREATE POLICY "Users can insert their own ICE candidates" 
ON ice_candidates FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Also ensure users can view ICE candidates in their rooms
DROP POLICY IF EXISTS "Users can view ICE candidates for their rooms" ON ice_candidates;
CREATE POLICY "Users can view ICE candidates for their rooms" 
ON ice_candidates FOR SELECT 
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM call_rooms 
    WHERE call_rooms.room_id = ice_candidates.room_id 
    AND (
      call_rooms.caller_id = auth.uid() 
      OR call_rooms.callee_id = auth.uid() 
      OR auth.uid() = ANY(call_rooms.participant_ids)
    )
  )
);