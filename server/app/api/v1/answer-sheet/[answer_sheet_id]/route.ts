import { ApiResponse } from "@/lib/api-response";
import { AnswerSheetService } from "@/services/answer-sheet.service";
import { Logger } from "@/lib/logger";
import { ErrorCode, ErrorMessage } from "@/constants";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ answer_sheet_id: string }> }
) {
  try {
    const { answer_sheet_id } = await params;
    const sheetId = Number(answer_sheet_id);

    if (isNaN(sheetId)) {
      return ApiResponse.error(ErrorMessage.NOT_FOUND, ErrorCode.NOT_FOUND, { answer_sheet_id: "Invalid answer_sheet_id" });
    }

    // Check if a body with status was provided
    let bodyText = "";
    try {
      bodyText = await request.clone().text();
    } catch (e) {}

    if (bodyText) {
      const body = await request.json();
      if (body && typeof body.status === "number") {
        const updated = await AnswerSheetService.updateStatus(sheetId, body.status);
        if (!updated) {
          return ApiResponse.error(ErrorMessage.NOT_FOUND, ErrorCode.NOT_FOUND, { answer_sheet_id: "Answer sheet not found" });
        }
        return ApiResponse.success({ message: "Status updated successfully" });
      }
    }

    const data = await AnswerSheetService.getDetails(sheetId);
    
    if (!data) {
      return ApiResponse.error(ErrorMessage.NOT_FOUND, ErrorCode.NOT_FOUND, { answer_sheet_id: "Invalid answer_sheet_id" });
    }

    return ApiResponse.success(data);
  } catch (error: any) {
    Logger.error("Error in details/update API", error);
    return ApiResponse.error(ErrorMessage.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
  }
}

