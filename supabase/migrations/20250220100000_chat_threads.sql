-- Chat sessions: ChatThread + thread_id on ChatMessage
CREATE TABLE IF NOT EXISTS "ChatThread" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "ChatMessage" ADD COLUMN IF NOT EXISTS "thread_id" TEXT REFERENCES "ChatThread"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "ChatMessage_thread_id_idx" ON "ChatMessage"("thread_id");
