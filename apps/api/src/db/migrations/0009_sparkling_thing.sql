CREATE TABLE "tenant_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" varchar(16) NOT NULL,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"label" varchar(100),
	"expires_at" timestamp with time zone,
	"max_uses" smallint,
	"used_count" smallint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenant_invitations_code_unique" UNIQUE("code"),
	CONSTRAINT "tenant_invitations_role_check" CHECK ("tenant_invitations"."role" IN ('admin', 'member'))
);
--> statement-breakpoint
ALTER TABLE "tenant_invitations" ADD CONSTRAINT "tenant_invitations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tenant_invitations_tenant" ON "tenant_invitations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_tenant_invitations_code" ON "tenant_invitations" USING btree ("code");