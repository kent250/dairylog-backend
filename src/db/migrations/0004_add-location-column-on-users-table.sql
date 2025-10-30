ALTER TABLE "users" ALTER COLUMN "collection_name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" varchar;