-- Fix notification type constraint to allow 'call' type
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('mention', 'message', 'call', 'warning', 'system'));

-- Fix ice_candidates RLS policy issue
DROP POLICY IF EXISTS "Users can insert ICE candidates for their rooms" ON ice_candidates;
CREATE POLICY "Users can insert ICE candidates for their rooms" 
ON ice_candidates FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
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