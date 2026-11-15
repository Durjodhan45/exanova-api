export interface ApiResponseMeta {
  timestamp?: string;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: ApiResponseMeta;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  statusCode: number;
  error: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

export interface CurrentUserPayload {
  sub: string; // user id
  id: string;
  email: string;
  username: string;
  role: string;
  studentId?: string;
  facultyId?: string;
  sessionId?: string;
}
