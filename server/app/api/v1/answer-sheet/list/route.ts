import { ApiResponse } from "@/lib/api-response";
import { AnswerSheetService } from "@/services/answer-sheet.service";
import { Logger } from "@/lib/logger";
import { ErrorCode, ErrorMessage } from "@/constants";

export async function POST(request: Request) {
  try {
    let body: any = {};
    const text = await request.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (e) {
        Logger.error("Failed to parse JSON body", e);
      }
    }

    const data = await AnswerSheetService.list(body);

    if (data.records.length === 0 && data.page === 1 && !body.search && Object.keys(body.filters || {}).length === 0) {
       return ApiResponse.error(ErrorMessage.NOT_FOUND, ErrorCode.NOT_FOUND);
    }

    return ApiResponse.success(data);
  } catch (error: any) {
    Logger.error("Error in list API", error);
    return ApiResponse.error(ErrorMessage.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
