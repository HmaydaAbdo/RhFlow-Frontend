export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
  fieldErrors: Record<string, string>;
}
