
-- Add total_won columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_won numeric NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_won_usdt numeric NOT NULL DEFAULT 0;

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS for friendships
CREATE POLICY "Users can view own friendships" ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update received requests" ON public.friendships FOR UPDATE USING (auth.uid() = friend_id);
CREATE POLICY "Users can delete own friendships" ON public.friendships FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create game_invites table
CREATE TABLE public.game_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id UUID REFERENCES public.games(id) ON DELETE SET NULL,
  stake_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BNB',
  time_control INTEGER NOT NULL DEFAULT 600,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

-- RLS for game_invites
CREATE POLICY "Users can view own invites" ON public.game_invites FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can send invites" ON public.game_invites FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "Users can update received invites" ON public.game_invites FOR UPDATE USING (auth.uid() = to_user_id);
CREATE POLICY "Users can delete own invites" ON public.game_invites FOR DELETE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;
