import { ApiResponse } from "@/lib/api-response";
import { Logger } from "@/lib/logger";
import { ErrorCode, ErrorMessage } from "@/constants";
import { db } from "@/lib/db";
import { questionAndAnswer } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const keyId = Number(id);

    if (isNaN(keyId)) {
      return ApiResponse.error(ErrorMessage.NOT_FOUND, ErrorCode.NOT_FOUND, { id: "Invalid question_and_answer_id" });
    }

    const body = await request.json();
    
    const updateData: any = {};
    if (body.correct_answer !== undefined) updateData.correctAnswer = body.correct_answer;
    if (body.question_text !== undefined) updateData.questionText = body.question_text;
    if (body.option_a !== undefined) updateData.optionA = body.option_a;
    if (body.option_b !== undefined) updateData.optionB = body.option_b;
    if (body.option_c !== undefined) updateData.optionC = body.option_c;
    if (body.option_d !== undefined) updateData.optionD = body.option_d;
    if (body.question_image !== undefined) updateData.questionImage = body.question_image;
    if (body.option_a_image !== undefined) updateData.optionAImage = body.option_a_image;
    if (body.option_b_image !== undefined) updateData.optionBImage = body.option_b_image;
    if (body.option_c_image !== undefined) updateData.optionCImage = body.option_c_image;
    if (body.option_d_image !== undefined) updateData.optionDImage = body.option_d_image;

    updateData.updatedAt = new Date();

    const [updated] = await db.update(questionAndAnswer)
      .set(updateData)
      .where(eq(questionAndAnswer.questionAndAnswerId, keyId))
      .returning();

    if (!updated) {
      return ApiResponse.error(ErrorMessage.NOT_FOUND, ErrorCode.NOT_FOUND, { message: "Failed to update answer key" });
    }

    return ApiResponse.success({ message: "Answer key updated successfully", data: updated });
  } catch (error: any) {
    Logger.error("Error in answer key update API", error);
    return ApiResponse.error(ErrorMessage.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
