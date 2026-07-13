CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"reviewer_id" integer NOT NULL,
	"submission_id" integer NOT NULL,
	"issue_url" text NOT NULL,
	"is_deep" boolean DEFAULT false NOT NULL,
	"filed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_reviewer_id_submission_id_unique" UNIQUE("reviewer_id","submission_id")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"repo_url" text NOT NULL,
	"live_url" text,
	"merged_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "submissions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"voter_id" integer NOT NULL,
	"submission_id" integer NOT NULL,
	"thumbs_up" boolean NOT NULL,
	"cast_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "votes_voter_id_submission_id_unique" UNIQUE("voter_id","submission_id")
);
--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_voter_id_users_id_fk" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE no action ON UPDATE no action;