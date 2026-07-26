CREATE TABLE "question_and_answer" (
	"question_and_answer_id" bigserial PRIMARY KEY NOT NULL,
	"year" integer DEFAULT 2026 NOT NULL,
	"branch" varchar(50) NOT NULL,
	"paper" integer NOT NULL,
	"booklet_version" varchar(2) NOT NULL,
	"question_number" integer NOT NULL,
	"correct_answer" varchar(1) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "question_and_answer_unique" UNIQUE("year","branch","booklet_version","question_number")
);
