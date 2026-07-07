export class HttpError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const unauthorized = (message = "Authentication required") => new HttpError(401, message);
export const forbidden = (message = "Access denied") => new HttpError(403, message);
export const notFound = (message = "Resource not found") => new HttpError(404, message);
export const conflict = (message = "Resource already exists") => new HttpError(409, message);
