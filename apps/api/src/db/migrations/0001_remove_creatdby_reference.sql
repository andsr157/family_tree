ALTER TABLE "persons" DROP CONSTRAINT "persons_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "relationships" DROP CONSTRAINT "relationships_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "family_trees" DROP CONSTRAINT "family_trees_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "persons" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "relationships" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "created_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "family_trees" ALTER COLUMN "created_by" DROP NOT NULL;