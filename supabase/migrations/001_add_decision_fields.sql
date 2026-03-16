-- Migration 001: Add decision fields to agent_history
-- Run this in the Supabase SQL editor.

ALTER TABLE agent_history
  ADD COLUMN posted_this_run    boolean NOT NULL DEFAULT true,
  ADD COLUMN decision_reasoning text;

-- Backfill: rows with no post_id were comment/observe-only runs
UPDATE agent_history
SET posted_this_run = false
WHERE post_id IS NULL;
