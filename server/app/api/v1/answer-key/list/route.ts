import { ApiResponse } from "@/lib/api-response";
import { Logger } from "@/lib/logger";
import { ErrorCode, ErrorMessage } from "@/constants";
import { db } from "@/lib/db";
import { questionAndAnswer } from "@/lib/schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { page = 1, size = 20, search = "", filters = {} } = body;

    const limit = size;
    const offset = (page - 1) * size;
    const conditions = [];

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(questionAndAnswer.branch, searchPattern),
          ilike(questionAndAnswer.bookletVersion, searchPattern)
        )
      );
    }

    if (filters.year !== undefined) conditions.push(eq(questionAndAnswer.year, filters.year));
    if (filters.branch) conditions.push(eq(questionAndAnswer.branch, filters.branch));
    if (filters.booklet_version) conditions.push(eq(questionAndAnswer.bookletVersion, filters.booklet_version));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(questionAndAnswer)
      .where(whereClause);

    const records = await db
      .select()
      .from(questionAndAnswer)
      .where(whereClause)
      .orderBy(asc(questionAndAnswer.bookletVersion), asc(questionAndAnswer.questionNumber))
      .limit(limit)
      .offset(offset);

    const [years, branches, booklets] = await Promise.all([
      db.selectDistinct({ value: questionAndAnswer.year }).from(questionAndAnswer).orderBy(questionAndAnswer.year),
      db.selectDistinct({ value: questionAndAnswer.branch }).from(questionAndAnswer).orderBy(questionAndAnswer.branch),
      db.selectDistinct({ value: questionAndAnswer.bookletVersion }).from(questionAndAnswer).orderBy(questionAndAnswer.bookletVersion)
    ]);

    const formattedRecords = records.map(r => ({
      question_and_answer_id: Number(r.questionAndAnswerId),
      year: r.year,
      branch: r.branch,
      booklet_version: r.bookletVersion,
      question_number: r.questionNumber,
      question_text: r.questionText,
      option_a: r.optionA,
      option_b: r.optionB,
      option_c: r.optionC,
      option_d: r.optionD,
      correct_answer: r.correctAnswer,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }));

    return ApiResponse.success({
      page,
      size,
      total_records: count,
      total_pages: Math.ceil(count / size),
      records: formattedRecords,
      filters: {
        years: years.map(r => r.value),
        branches: branches.map(r => r.value),
        booklets: booklets.map(r => r.value)
      }
    });
  } catch (error: any) {
    Logger.error("Error in answer key list API", error);
    return ApiResponse.error(ErrorMessage.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
