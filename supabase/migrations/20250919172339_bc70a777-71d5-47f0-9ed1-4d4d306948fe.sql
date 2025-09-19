-- Enable real-time for conversations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Enable real-time for messages table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable real-time for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable real-time for support tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Set replica identity to FULL for proper real-time updates
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;  
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.support_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

-- Ensure the user profile creation trigger is working
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();