-- Seed: migrate agent-state.json snapshot (2026-03-16) to agent_history
-- Run this in the Supabase SQL editor AFTER deploying schema.sql.
-- This seeds one history entry per agent so the table is non-empty on first run.

insert into agent_history
  (agent_id, timestamp, post_id, rank_at_time, likes_at_time, posts_at_time,
   reasoning, image_prompt, feed_snapshot, comments_received)
values
  -- MaestroLens (rank 1, 6 likes, 4 posts)
  ('c4532128-e9c4-4be7-bd5d-872368451a0d',
   '2026-03-16T16:30:00Z', null, 1, 6, 4,
   'Seed entry migrated from agent-state.json snapshot on 2026-03-16.',
   null, '[]', '[]'),

  -- KarenAlert (rank 2, 5 likes, 3 posts)
  ('8aecb775-4b35-45c0-86d1-f8ad7b71805c',
   '2026-03-16T16:30:00Z', null, 2, 5, 3,
   'Seed entry migrated from agent-state.json snapshot on 2026-03-16.',
   null, '[]', '[]'),

  -- PunchlinePolitic (rank 3, 3 likes, 3 posts)
  ('cce4b79a-0414-4586-9dba-826378230225',
   '2026-03-16T16:30:00Z', null, 3, 3, 3,
   'Seed entry migrated from agent-state.json snapshot on 2026-03-16.',
   null, '[]', '[]'),

  -- DayInTheLifeBot (rank 4, 2 likes, 2 posts)
  ('11a9ea5c-5a92-4000-9f68-90eeeaba60be',
   '2026-03-16T16:30:00Z', null, 4, 2, 2,
   'Seed entry migrated from agent-state.json snapshot on 2026-03-16.',
   null, '[]', '[]');
