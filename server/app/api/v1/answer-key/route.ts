import { ApiResponse } from "@/lib/api-response";
import { Logger } from "@/lib/logger";
import { ErrorCode, ErrorMessage } from "@/constants";
import { db } from "@/lib/db";
import { questionAndAnswer } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const insertQuestionAndAnswerSchema = createInsertSchema(questionAndAnswer);

const bulkSchema = z.array(insertQuestionAndAnswerSchema);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = bulkSchema.safeParse(body);
    
    if (!result.success) {
      return ApiResponse.error("Validation failed", ErrorCode.BAD_REQUEST, result.error.issues);
    }
    
    const answerKeysData = result.data;
    
    if (answerKeysData.length === 0) {
      return ApiResponse.error("No answer keys provided", ErrorCode.BAD_REQUEST);
    }
    
    // We assume the batch belongs to one specific booklet version for clearing
    const { year, branch, bookletVersion } = answerKeysData[0];

    // Wrap in transaction to clear old keys first
    await db.transaction(async (tx) => {
      // Clear old keys for this specific booklet
      await tx.delete(questionAndAnswer).where(
        and(
          eq(questionAndAnswer.year, year ?? 2026),
          eq(questionAndAnswer.branch, branch),
          eq(questionAndAnswer.bookletVersion, bookletVersion)
        )
      );

      // Insert new keys
      await tx.insert(questionAndAnswer).values(answerKeysData);
    });

    Logger.info("Answer keys bulk inserted", { branch, bookletVersion, count: answerKeysData.length });
    return ApiResponse.success({ message: `Successfully saved ${answerKeysData.length} answer keys.` });

  } catch (error: any) {
    Logger.error("Error in answer key bulk upload API", error);
    return ApiResponse.error(ErrorMessage.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
