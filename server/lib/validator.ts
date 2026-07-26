import { ErrorCode, ErrorMessage, PaperCodeHelper } from "@/constants";

export class ValidationError extends Error {
  public statusCode: number;
  public fields: any;

  constructor(message: string, fields: any = {}) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = ErrorCode.BAD_REQUEST;
    this.fields = fields;
  }
}

export class Validator {
  static validateUploadData(data: any) {
    const errors: any = {};

    if (!data.candidate_name || typeof data.candidate_name !== 'string' || data.candidate_name.length > 30) {
      errors.candidate_name = "Candidate name must be a string up to 30 characters";
    }

    const regNum = data.registration_number ? String(data.registration_number) : '';
    if (!regNum || regNum.length > 9) {
      errors.registration_number = "Registration number must be a string up to 9 characters";
    } else {
      data.registration_number = regNum; // Normalize to string for the service
    }

    const validPapers = PaperCodeHelper.getValues();
    if (!data.paper || typeof data.paper !== 'number' || !validPapers.includes(data.paper)) {
      errors.paper = `Paper must be a valid code: ${validPapers.join(', ')}`;
    }

    if (!data.booklet_version || typeof data.booklet_version !== 'string' || data.booklet_version.length > 2) {
      errors.booklet_version = "Booklet version must be a string up to 2 characters";
    }

    if (!data.booklet_serial_no || typeof data.booklet_serial_no !== 'string' || data.booklet_serial_no.length > 6) {
      errors.booklet_serial_no = "Booklet serial number must be a string up to 6 characters";
    }

    const userResponses = data.responses || data.answer_responses;
    if (userResponses) {
      if (!Array.isArray(userResponses)) {
        errors.responses = "Responses must be an array";
      } else {
        // Basic validation for array items
        for (let i = 0; i < userResponses.length; i++) {
          const r = userResponses[i];
          if (typeof r.question_number !== 'number') {
            errors.responses = "Each response must have a valid numeric question_number";
            break;
          }
        }
      }
    } else {
      errors.responses = "Responses array is required";
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(ErrorMessage.BAD_REQUEST, errors);
    }
  }
}
