-- Keep published game-plan changes live across coach/player devices.
-- Applied to Supabase as migration 20260814055259_enable_game_plans_realtime.

alter publication supabase_realtime add table public.game_plans;
