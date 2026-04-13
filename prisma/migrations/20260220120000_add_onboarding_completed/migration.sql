-- Interactive onboarding: completion flag (separate from preferences text).
ALTER TABLE "user_chat_profile" ADD COLUMN "onboarding_completed" BOOLEAN NOT NULL DEFAULT false;

-- Existing profiles were created before this feature; treat them as finished onboarding.
UPDATE "user_chat_profile" SET "onboarding_completed" = true;
