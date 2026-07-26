export class Logger {
  static info(message: string, meta?: any) {
    const logData = { level: 'INFO', timestamp: new Date().toISOString(), message, meta };
    console.log(JSON.stringify(logData));
  }

  static error(message: string, error?: any) {
    // If the error is an Error object, extract its message and stack
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, ...(error as any) }
      : error;
      
    const logData = { level: 'ERROR', timestamp: new Date().toISOString(), message, error: errorDetails };
    console.error(JSON.stringify(logData));
  }

  static warn(message: string, meta?: any) {
    const logData = { level: 'WARN', timestamp: new Date().toISOString(), message, meta };
    console.warn(JSON.stringify(logData));
  }
}
