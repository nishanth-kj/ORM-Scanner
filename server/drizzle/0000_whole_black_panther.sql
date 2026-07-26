CREATE TABLE "answer_sheet" (
	"answer_sheet_id" bigserial PRIMARY KEY NOT NULL,
	"candidate_name" varchar(30) NOT NULL,
	"registration_number" varchar(9) NOT NULL,
	"branch" varchar(50) DEFAULT 'Civil Engineering' NOT NULL,
	"booklet_version" char(2) NOT NULL,
	"booklet_serial_no" varchar(6) NOT NULL,
	"status" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "answer_sheet_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE TABLE "question_and_answer" (
	"question_and_answer_id" bigserial PRIMARY KEY NOT NULL,
	"year" integer DEFAULT 2026 NOT NULL,
	"branch" varchar(50) NOT NULL,
	"booklet_version" varchar(2) NOT NULL,
	"question_number" integer NOT NULL,
	"question_text" text,
	"question_image" text,
	"option_a" text,
	"option_a_image" text,
	"option_b" text,
	"option_b_image" text,
	"option_c" text,
	"option_c_image" text,
	"option_d" text,
	"option_d_image" text,
	"correct_answer" varchar(1) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "question_and_answer_unique" UNIQUE("year","branch","booklet_version","question_number")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"response_id" bigserial PRIMARY KEY NOT NULL,
	"answer_sheet_id" integer NOT NULL,
	"question_number" integer NOT NULL,
	"user_answer" varchar(1),
	"correct_answer" varchar(1),
	"status" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_answer_sheet_id_answer_sheet_answer_sheet_id_fk" FOREIGN KEY ("answer_sheet_id") REFERENCES "public"."answer_sheet"("answer_sheet_id") ON DELETE no action ON UPDATE no action;