-- Step 1: Drop all foreign key constraints that depend on User.id
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_User_id_fk";
ALTER TABLE "Document" DROP CONSTRAINT "Document_userId_User_id_fk";
ALTER TABLE "Suggestion" DROP CONSTRAINT "Suggestion_userId_User_id_fk";

-- Step 2: Alter the data type of the User.id primary key.
-- This requires a 'USING' clause to tell PostgreSQL how to cast the existing UUIDs to text.
ALTER TABLE "User" ALTER COLUMN "id" SET DATA TYPE varchar(255) USING "id"::text;

-- Step 3: Alter the data type of all the foreign key columns in other tables.
ALTER TABLE "Chat" ALTER COLUMN "userId" SET DATA TYPE varchar(255) USING "userId"::text;
ALTER TABLE "Document" ALTER COLUMN "userId" SET DATA TYPE varchar(255) USING "userId"::text;
ALTER TABLE "Suggestion" ALTER COLUMN "userId" SET DATA TYPE varchar(255) USING "userId"::text;

-- Step 4: Re-add the foreign key constraints with the now-compatible column types.
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;