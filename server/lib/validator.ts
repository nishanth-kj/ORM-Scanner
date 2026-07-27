import { ErrorCode, ErrorMessage, BranchCodeHelper, BookletVersionHelper } from "@/constants";

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

    const validBranches = BranchCodeHelper.getValues();
    if (!data.branch || typeof data.branch !== 'string' || !validBranches.includes(data.branch)) {
      errors.branch = `Branch must be a valid stream: ${validBranches.join(', ')}`;
    }

    const validBookletVersions = BookletVersionHelper.getValues();
    if (!data.booklet_version || typeof data.booklet_version !== 'string' || !validBookletVersions.includes(data.booklet_version)) {
      errors.booklet_version = `Booklet version must be one of: ${validBookletVersions.join(', ')}`;
    }

    if (!data.booklet_serial_no || typeof data.booklet_serial_no !== 'string' || data.booklet_serial_no.length > 7) {
      errors.booklet_serial_no = "Booklet serial number must be a string up to 7 characters";
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
