ALTER TABLE "persons" DROP CONSTRAINT "persons_gender_check";--> statement-breakpoint
CREATE INDEX "idx_events_tenant" ON "events" USING btree ("tenant_id");--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_gender_check" CHECK ("persons"."gender" IN ('male', 'female', 'other'));