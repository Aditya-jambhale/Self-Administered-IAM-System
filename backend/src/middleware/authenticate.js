import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { unauthorized } from "../utils/httpError.js";

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
};

const authenticate = asyncHandler(async (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    throw unauthorized();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret-change-me");
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, isRoot: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      throw unauthorized("Invalid token user");
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw unauthorized("Invalid or expired token");
  }
});

export default authenticate;
