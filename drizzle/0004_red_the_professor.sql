ALTER TYPE "public"."event_kind" ADD VALUE 'ball_passed';--> statement-breakpoint
ALTER TYPE "public"."event_kind" ADD VALUE 'ball_caught';--> statement-breakpoint
ALTER TYPE "public"."event_kind" ADD VALUE 'ball_dropped';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "elapsed_s" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ball_passed_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "ball_passer_id" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "rally_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_ball_passer_id_users_id_fk" FOREIGN KEY ("ball_passer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;