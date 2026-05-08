export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiList<T> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
export type ApiListResponse<T> = ApiList<T> | ApiError;
