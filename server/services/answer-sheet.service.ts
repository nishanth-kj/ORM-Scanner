import { db } from "@/lib/db";
import { answerSheet, responses, questionAndAnswer } from "@/lib/schema";
import { ilike, or, and, desc, asc, eq, sql } from "drizzle-orm";
import { Logger } from "@/lib/logger";
import { Status } from "@/constants";
import { Validator } from "@/lib/validator";

export class AnswerSheetService {
  static async upload(data: any) {
    Validator.validateUploadData(data);
    
    Logger.info("Uploading answer sheet", { registrationNumber: data.registration_number });
    const { candidate_name, registration_number, branch, booklet_version, booklet_serial_no } = data;
    const userResponses = data.responses || data.answer_responses;

    const result = await db.transaction(async (tx) => {
      let sheetId;
      const existing = await tx.select().from(answerSheet).where(eq(answerSheet.registrationNumber, registration_number)).limit(1);

      if (existing.length > 0) {
        // Update existing record (does not consume sequence)
        const [updated] = await tx.update(answerSheet)
          .set({
            candidateName: candidate_name,
            branch: branch,
            bookletVersion: booklet_version,
            bookletSerialNo: booklet_serial_no,
            status: Status.ACTIVE,
            updatedAt: new Date(),
          })
          .where(eq(answerSheet.registrationNumber, registration_number))
          .returning({ answerSheetId: answerSheet.answerSheetId });
        sheetId = updated.answerSheetId;
      } else {
        // Insert new record
        const [inserted] = await tx.insert(answerSheet)
          .values({
            candidateName: candidate_name,
            registrationNumber: registration_number,
            branch: branch,
            bookletVersion: booklet_version,
            bookletSerialNo: booklet_serial_no,
            status: Status.ACTIVE,
          })
          .returning({ answerSheetId: answerSheet.answerSheetId });
        sheetId = inserted.answerSheetId;
      }

      const newSheet = { answerSheetId: Number(sheetId) };

      if (userResponses && userResponses.length > 0) {
        // Clear previous responses for this answer sheet
        await tx.delete(responses).where(eq(responses.answerSheetId, newSheet.answerSheetId));

        // Fetch answer key for this paper and booklet
        const answerKeys = await tx.select().from(questionAndAnswer).where(
          and(
            eq(questionAndAnswer.branch, branch),
            eq(questionAndAnswer.bookletVersion, booklet_version),
            eq(questionAndAnswer.year, 2026) // Hardcoded 2026 for now
          )
        );

        const answerKeyMap = new Map();
        answerKeys.forEach(k => {
          answerKeyMap.set(k.questionNumber, k.correctAnswer);
        });

        // Bulk insert new responses in one DB call
        const responsesData = userResponses.map((r: any) => {
          const expected = answerKeyMap.get(r.question_number);
          const isCorrect = expected && expected === r.user_answer;
          
          return {
            answerSheetId: newSheet.answerSheetId,
            questionNumber: r.question_number,
            userAnswer: r.user_answer || null,
            correctAnswer: expected || null,
            status: isCorrect ? 1 : 0,
          };
        });
        await tx.insert(responses).values(responsesData);
      }

      return newSheet;
    });

    Logger.info("Answer sheet uploaded/updated successfully", { answerSheetId: result.answerSheetId });
    return { answer_sheet_id: Number(result.answerSheetId) };
  }

  static async list(params: any) {
    Logger.info("Listing answer sheets", { params });
    const { page = 1, size = 20, search = "", sort_by = "created_at", sort_order = "desc", filters = {} } = params;

    const limit = size;
    const offset = (page - 1) * size;
    const conditions = [];

    if (search) {
      const searchPattern = `%${search}%`;
      const searchNum = Number(search);
      const orConditions = [
        ilike(answerSheet.candidateName, searchPattern),
        ilike(answerSheet.registrationNumber, searchPattern),
        ilike(answerSheet.bookletVersion, searchPattern),
        ilike(answerSheet.bookletSerialNo, searchPattern),
      ];
      if (!isNaN(searchNum)) {
         orConditions.push(eq(answerSheet.answerSheetId, searchNum));
      }
      conditions.push(or(...orConditions));
    }

    if (filters.branch) conditions.push(eq(answerSheet.branch, filters.branch));
    if (filters.booklet_version) conditions.push(eq(answerSheet.bookletVersion, filters.booklet_version));
    if (filters.status !== undefined) conditions.push(eq(answerSheet.status, filters.status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let sortColumn;
    switch (sort_by) {
      case "answer_sheet_id": sortColumn = answerSheet.answerSheetId; break;
      case "candidate_name": sortColumn = answerSheet.candidateName; break;
      case "registration_number": sortColumn = answerSheet.registrationNumber; break;
      case "branch": sortColumn = answerSheet.branch; break;
      case "booklet_version": sortColumn = answerSheet.bookletVersion; break;
      case "booklet_serial_no": sortColumn = answerSheet.bookletSerialNo; break;
      case "status": sortColumn = answerSheet.status; break;
      case "updated_at": sortColumn = answerSheet.updatedAt; break;
      default: sortColumn = answerSheet.createdAt; break;
    }

    const sortFn = sort_order.toLowerCase() === "asc" ? asc : desc;

    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(answerSheet)
      .where(whereClause);

    const records = await db
      .select()
      .from(answerSheet)
      .where(whereClause)
      .orderBy(sortFn(sortColumn))
      .limit(limit)
      .offset(offset);

    const formattedRecords = records.map(r => ({
      answer_sheet_id: Number(r.answerSheetId),
      candidate_name: r.candidateName,
      registration_number: r.registrationNumber,
      branch: r.branch,
      booklet_version: r.bookletVersion,
      booklet_serial_no: r.bookletSerialNo,
      status: r.status,
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }));

    return {
      page,
      size,
      total_records: count,
      total_pages: Math.ceil(count / size),
      records: formattedRecords
    };
  }

  static async getDetails(answerSheetId: number) {
    Logger.info("Fetching answer sheet details", { answerSheetId });
    const sheet = await db.query.answerSheet.findFirst({
      where: eq(answerSheet.answerSheetId, answerSheetId),
      with: {
        responses: true,
      },
    });

    if (!sheet) {
      return null;
    }
    
    // Fetch corresponding answer keys to include question text and options
    const answerKeys = await db.select().from(questionAndAnswer).where(
      and(
        eq(questionAndAnswer.branch, sheet.branch),
        eq(questionAndAnswer.bookletVersion, sheet.bookletVersion)
      )
    );
    
    const answerKeyMap = new Map();
    answerKeys.forEach(k => {
      answerKeyMap.set(k.questionNumber, k);
    });

    return {
      answer_sheet_id: Number(sheet.answerSheetId),
      candidate_name: sheet.candidateName,
      registration_number: sheet.registrationNumber,
      branch: sheet.branch,
      booklet_version: sheet.bookletVersion,
      booklet_serial_no: sheet.bookletSerialNo,
      status: sheet.status,
      created_at: sheet.createdAt,
      updated_at: sheet.updatedAt,
      responses: sheet.responses.map(r => {
        const keyData = answerKeyMap.get(r.questionNumber);
        return {
          question_number: r.questionNumber,
          user_answer: r.userAnswer,
          correct_answer: r.correctAnswer,
          status: r.status,
          question_text: keyData?.questionText,
          question_image: keyData?.questionImage,
          option_a: keyData?.optionA,
          option_a_image: keyData?.optionAImage,
          option_b: keyData?.optionB,
          option_b_image: keyData?.optionBImage,
          option_c: keyData?.optionC,
          option_c_image: keyData?.optionCImage,
          option_d: keyData?.optionD,
          option_d_image: keyData?.optionDImage,
        };
      }),
    };
  }

  static async updateStatus(answerSheetId: number, newStatus: number) {
    Logger.info("Updating answer sheet status", { answerSheetId, newStatus });
    
    // Check if exists
    const existing = await db.select().from(answerSheet).where(eq(answerSheet.answerSheetId, answerSheetId)).limit(1);
    
    if (existing.length === 0) {
      return false; // not found
    }

    // Update status
    await db.update(answerSheet)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(answerSheet.answerSheetId, answerSheetId));
      
    return true;
  }
}
