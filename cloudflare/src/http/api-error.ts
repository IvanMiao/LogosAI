export class ApiError extends Error {
  readonly code: string;
  readonly status: 400 | 401 | 404 | 409 | 413 | 422 | 500 | 502;

  constructor(
    status: ApiError['status'],
    code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
