-- Migration: add_transcript_turn_unique_constraint
-- Enforce (session_id, turn_number) uniqueness to prevent duplicate turns under concurrency (F03)

CREATE UNIQUE INDEX IF NOT EXISTS "debate_transcripts_session_id_turn_number_key"
ON "debate_transcripts"("session_id", "turn_number");
