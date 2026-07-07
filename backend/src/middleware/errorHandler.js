import { Prisma } from "@prisma/client";

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, message: "Unique constraint failed" });
    }

    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }
  }

  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    message: statusCode === 500 ? "Internal server error" : err.message,
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (statusCode === 500) {
    console.error(err);
  }

  return res.status(statusCode).json(payload);
};

export default errorHandler;
