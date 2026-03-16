-- Run this in Supabase SQL Editor to create tables matching your Prisma schema.
-- Tables: OAuthAccount, MeetingThread, ChatMessage (no User model in schema).

-- OAuthAccount
CREATE TABLE IF NOT EXISTS "OAuthAccount" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_account_id" TEXT NOT NULL,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthAccount_user_id_provider_key" UNIQUE ("user_id", "provider")
);

-- MeetingThread
CREATE TABLE IF NOT EXISTS "MeetingThread" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "recipient_email" TEXT NOT NULL,
  "recipient_name" TEXT,
  "subject" TEXT NOT NULL,
  "proposed_slots" TEXT NOT NULL,
  "selected_slot" TEXT,
  "status" TEXT NOT NULL,
  "email_thread_id" TEXT,
  "calendar_event_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ChatMessage
CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Optional: trigger to auto-update "updated_at" (Prisma client sets this; run only if you want DB-side updates)
-- CREATE OR REPLACE FUNCTION set_updated_at()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   NEW."updated_at" = CURRENT_TIMESTAMP;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- DROP TRIGGER IF EXISTS "OAuthAccount_updated_at" ON "OAuthAccount";
-- CREATE TRIGGER "OAuthAccount_updated_at" BEFORE UPDATE ON "OAuthAccount" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- DROP TRIGGER IF EXISTS "MeetingThread_updated_at" ON "MeetingThread";
-- CREATE TRIGGER "MeetingThread_updated_at" BEFORE UPDATE ON "MeetingThread" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
