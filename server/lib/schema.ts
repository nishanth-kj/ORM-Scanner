import {
  pgTable,
  bigserial,
  varchar,
  integer,
  char,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from 'drizzle-orm';

export const answerSheet = pgTable("answer_sheet", {
  answerSheetId: bigserial("answer_sheet_id", { mode: "number" }).primaryKey(),
  candidateName: varchar("candidate_name", { length: 30 }).notNull(),
  registrationNumber: varchar("registration_number", { length: 9 }).notNull().unique(),
  branch: varchar("branch", { length: 50 }).notNull().default('Civil Engineering'),
  bookletVersion: char("booklet_version", { length: 2 }).notNull(),
  bookletSerialNo: varchar("booklet_serial_no", { length: 7 }).notNull(),
  status: integer("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const answerSheetRelations = relations(answerSheet, ({ many }) => ({
  responses: many(responses),
}));

export const responses = pgTable("responses", {
  responseId: bigserial("response_id", { mode: "number" }).primaryKey(),
  answerSheetId: integer("answer_sheet_id").references(() => answerSheet.answerSheetId).notNull(),
  questionNumber: integer("question_number").notNull(),
  userAnswer: varchar("user_answer", { length: 1 }),
  correctAnswer: varchar("correct_answer", { length: 1 }),
  status: integer("status").notNull(),
});

export const responsesRelations = relations(responses, ({ one }) => ({
  answerSheet: one(answerSheet, {
    fields: [responses.answerSheetId],
    references: [answerSheet.answerSheetId],
  }),
}));

export const questionAndAnswer = pgTable("question_and_answer", {
  questionAndAnswerId: bigserial("question_and_answer_id", { mode: "number" }).primaryKey(),
  year: integer("year").notNull().default(2026),
  branch: varchar("branch", { length: 50 }).notNull(),
  bookletVersion: varchar("booklet_version", { length: 2 }).notNull(),
  questionNumber: integer("question_number").notNull(),
  questionText: text("question_text"),
  questionImage: text("question_image"),
  optionA: text("option_a"),
  optionAImage: text("option_a_image"),
  optionB: text("option_b"),
  optionBImage: text("option_b_image"),
  optionC: text("option_c"),
  optionCImage: text("option_c_image"),
  optionD: text("option_d"),
  optionDImage: text("option_d_image"),
  correctAnswer: varchar("correct_answer", { length: 1 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => [
  unique("question_and_answer_unique").on(t.year, t.branch, t.bookletVersion, t.questionNumber),
]);
