ALTER TABLE "Chat" ADD COLUMN "updatedAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "Chat" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "updated_at_idx" ON "Chat" USING btree ("updatedAt");