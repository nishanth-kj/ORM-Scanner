export enum ErrorCode {
  SUCCESS = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

export class ErrorCodeHelper {
  static getCodes(): string[] {
    return Object.keys(ErrorCode).filter(k => isNaN(Number(k)));
  }
  static getValues(): number[] {
    return Object.values(ErrorCode).filter(v => typeof v === "number") as number[];
  }
}

export enum ErrorMessage {
  SUCCESS = "Operation successful",
  CREATED = "Resource created successfully",
  BAD_REQUEST = "Bad request",
  UNAUTHORIZED = "Unauthorized access",
  NOT_FOUND = "Resource not found",
  INTERNAL_SERVER_ERROR = "Internal server error",
}

export class ErrorMessageHelper {
  static getCodes(): string[] {
    return Object.keys(ErrorMessage);
  }
  static getValues(): string[] {
    return Object.values(ErrorMessage);
  }
}
