import { ApiResponse } from "@/lib/api-response";
import { AnswerSheetService } from "@/services/answer-sheet.service";
import { Logger } from "@/lib/logger";
import { ErrorCode, ErrorMessage } from "@/constants";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    Logger.info("Received scanned OMR data from Python", { registration_number: data.registration_number });
    
    // Save to the database
    const savedRecord = await AnswerSheetService.upload(data);
    
    return ApiResponse.success({ db_record: savedRecord });
  } catch (error: any) {
    Logger.error("Error in upload API", error);
    // Return detailed validation errors if it's a ValidationError
    if (error.name === "ValidationError") {
      return ApiResponse.error(error.message, error.statusCode, error.fields);
    }
    return ApiResponse.error(ErrorMessage.INTERNAL_SERVER_ERROR, ErrorCode.INTERNAL_SERVER_ERROR);
  }
}
