/** Error that is sent to the app as { error: { code, message, details } } - the shape src/api/client.ts expects. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
