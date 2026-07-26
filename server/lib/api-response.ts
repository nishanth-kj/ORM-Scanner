import { NextResponse } from "next/server";

export class ApiResponse {
  static success(data: any, statusCode: number = 200) {
    return NextResponse.json(
      {
        status: 1,
        data,
        error: null,
      },
      { status: statusCode }
    );
  }

  static error(message: string, statusCode: number = 400, fields: any = {}) {
    return NextResponse.json(
      {
        status: 0,
        data: null,
        error: {
          status_code: statusCode,
          message,
          fields,
        },
      },
      { status: statusCode }
    );
  }
}
