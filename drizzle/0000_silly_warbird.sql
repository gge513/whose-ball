CREATE TYPE "public"."project_stage" AS ENUM('define', 'commit', 'build', 'verify', 'ship', 'teach');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('todo', 'building', 'verifying', 'done', 'blocked');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_id" integer NOT NULL,
	"stage" "project_stage" DEFAULT 'define' NOT NULL,
	"who_benefits" text,
	"what_changes" text,
	"done_looks_like" text,
	"next_action" text,
	"ball_holder_id" integer,
	"next_action_committed_for" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "task_status" DEFAULT 'todo' NOT NULL,
	"assignee_id" integer,
	"definition_of_done" text,
	"blocked_what_tried" text,
	"blocked_what_needed" text,
	"blocked_unblocker_id" integer,
	"blocked_at" timestamp,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text,
	"github_login" text,
	"name" text NOT NULL,
	"avatar_url" text,
	"password_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_github_login_unique" UNIQUE("github_login")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_ball_holder_id_users_id_fk" FOREIGN KEY ("ball_holder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_blocked_unblocker_id_users_id_fk" FOREIGN KEY ("blocked_unblocker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;