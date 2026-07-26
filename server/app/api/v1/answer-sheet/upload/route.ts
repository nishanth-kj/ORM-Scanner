import { ApiResponse } from "@/lib/api-response";
import { AnswerSheetService } from "@/services/answer-sheet.service";
import { Logger } from "@/lib/logger";
import { ErrorCode, ErrorMessage } from "@/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await AnswerSheetService.upload(body);
    return ApiResponse.success(data);
  } catch (error: any) {
    if (error.name === "ValidationError") {
      Logger.warn("Validation failed for upload", { fields: error.fields });
      return ApiResponse.error(error.message, error.statusCode, error.fields);
    }
    Logger.error("Error in upload API", error);
    return ApiResponse.error(ErrorMessage.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
