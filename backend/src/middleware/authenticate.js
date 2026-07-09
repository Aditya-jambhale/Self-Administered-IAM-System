import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { unauthorized } from "../utils/httpError.js";

const isProduction = process.env.NODE_ENV === "production";

const setAccessTokenCookie = (res, token) => {
  res.cookie("accessToken", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
};

const authenticate = asyncHandler(async (req, res, next) => {
  const accessToken = req.cookies?.accessToken;
  const refreshToken = req.cookies?.refreshToken;

  if (!accessToken && !refreshToken) {
    throw unauthorized("Authentication required");
  }

  if (accessToken) {
    try {
      const payload = jwt.verify(accessToken, process.env.JWT_SECRET || "dev-secret-change-me");
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, email: true, isRoot: true, createdAt: true, updatedAt: true },
      });

      if (!user) {
        throw unauthorized("Invalid token user");
      }

      req.user = user;
      return next();
    } catch (error) {
      if (error.name !== "TokenExpiredError" && !refreshToken) {
        throw unauthorized("Invalid or expired token");
      }
    }
  }

  // Attempt token refresh if a refresh token is present
  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_SECRET || "dev-secret-change-me");
      
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: {
          user: {
            select: { id: true, name: true, email: true, isRoot: true, createdAt: true, updatedAt: true },
          },
        },
      });

      if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
        throw unauthorized("Session expired, please log in again");
      }

      const user = storedToken.user;
      
      // Generate new access token
      const newAccessToken = jwt.sign(
        { sub: user.id, email: user.email, isRoot: user.isRoot },
        process.env.JWT_SECRET || "dev-secret-change-me",
        { expiresIn: "15m" }
      );

      // Set cookie for new access token
      setAccessTokenCookie(res, newAccessToken);

      req.user = user;
      return next();
    } catch (error) {
      throw unauthorized("Session expired, please log in again");
    }
  }

  throw unauthorized("Authentication required");
});

export default authenticate;
