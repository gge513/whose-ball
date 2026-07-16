CREATE TYPE "public"."whistle_cause" AS ENUM('unclear', 'too_big', 'missing_skill', 'waiting', 'moving');--> statement-breakpoint
ALTER TYPE "public"."event_kind" ADD VALUE 'whistle_blown';--> statement-breakpoint
ALTER TYPE "public"."event_kind" ADD VALUE 'ball_picked_up';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "whistle_blown_at" timestamp;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "whistle_cause" "whistle_cause";