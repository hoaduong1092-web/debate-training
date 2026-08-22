-- Migration: add_voice_quota_domain_models
-- Source of Truth: docs/VOICE_QUOTA_CONTRACT_v1.0.md
-- Non-Destructive Addition of VoiceSession, UserCreditPack, UserVipPass, UserFreeTrial

-- CreateTable
CREATE TABLE IF NOT EXISTS "voice_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "debate_session_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,
    "max_allowed_ms" INTEGER NOT NULL DEFAULT 900000,
    "actual_duration_ms" INTEGER NOT NULL DEFAULT 0,
    "billable_minutes" INTEGER NOT NULL DEFAULT 0,
    "consumed_sub_mins" INTEGER NOT NULL DEFAULT 0,
    "consumed_addon_mins" INTEGER NOT NULL DEFAULT 0,
    "consumption_details" JSONB,
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalized_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_credit_packs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "pack_code" VARCHAR(50) NOT NULL,
    "dimension" VARCHAR(20) NOT NULL,
    "total_units" INTEGER NOT NULL,
    "remaining_units" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "purchased_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_credit_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_vip_passes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "pass_code" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_vip_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_free_trials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "text_remaining" INTEGER NOT NULL DEFAULT 3,
    "voice_mins_remaining" INTEGER NOT NULL DEFAULT 5,
    "assistant_remaining" INTEGER NOT NULL DEFAULT 1,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_free_trials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "voice_sessions_user_id_status_idx" ON "voice_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "voice_sessions_started_at_idx" ON "voice_sessions"("started_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_credit_packs_user_id_dimension_status_expires_at_idx" ON "user_credit_packs"("user_id", "dimension", "status", "expires_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_vip_passes_user_id_status_expires_at_idx" ON "user_vip_passes"("user_id", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_free_trials_user_id_key" ON "user_free_trials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_free_trials_phone_number_key" ON "user_free_trials"("phone_number");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'voice_sessions_user_id_fkey') THEN
        ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'voice_sessions_debate_session_id_fkey') THEN
        ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_debate_session_id_fkey" FOREIGN KEY ("debate_session_id") REFERENCES "debate_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_credit_packs_user_id_fkey') THEN
        ALTER TABLE "user_credit_packs" ADD CONSTRAINT "user_credit_packs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_vip_passes_user_id_fkey') THEN
        ALTER TABLE "user_vip_passes" ADD CONSTRAINT "user_vip_passes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_free_trials_user_id_fkey') THEN
        ALTER TABLE "user_free_trials" ADD CONSTRAINT "user_free_trials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
