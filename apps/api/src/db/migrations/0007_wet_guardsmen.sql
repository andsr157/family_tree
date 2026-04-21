CREATE TYPE "public"."confidence_level" AS ENUM('confirmed', 'probable', 'possible', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('vital_record', 'census', 'photograph', 'oral_history', 'book', 'newspaper', 'religious', 'military', 'legal', 'website', 'other');--> statement-breakpoint
CREATE TABLE "citations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_id" uuid NOT NULL,
	"detail" varchar(500),
	"page_reference" varchar(200),
	"confidence" "confidence_level" DEFAULT 'probable' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	CONSTRAINT "citations_entity_type_check" CHECK ("citations"."entity_type" IN ('person', 'event', 'relationship'))
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"source_type" "source_type" NOT NULL,
	"author" varchar(300),
	"publisher" varchar(300),
	"publication_year" smallint,
	"url" varchar(2048),
	"url_accessed_at" date,
	"repository" varchar(500),
	"call_number" varchar(200),
	"page_number" varchar(100),
	"notes" text,
	"confidence" "confidence_level" DEFAULT 'probable' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid
);
--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_citations_source" ON "citations" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "idx_citations_entity" ON "citations" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_citations_tenant" ON "citations" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_citations_unique" ON "citations" USING btree ("source_id","entity_type","entity_id") WHERE "citations"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sources_tenant" ON "sources" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_sources_type" ON "sources" USING btree ("tenant_id","source_type");--> statement-breakpoint
CREATE INDEX "idx_sources_search" ON "sources" USING gin (to_tsvector('simple', "title"));