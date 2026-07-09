import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { badRequest, conflict, unauthorized } from "../utils/httpError.js";
import { sendSuccess } from "../utils/response.js";

const isProduction = process.env.NODE_ENV === "production";

const signAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, isRoot: user.isRoot },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { expiresIn: "15m" }
  );
};

const signRefreshToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, isRoot: user.isRoot },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { expiresIn: "7d" }
  );
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
  });
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isRoot: user.isRoot,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw badRequest("name, email, and password are required");
  }

  if (password.length < 6) {
    throw badRequest("password must be at least 6 characters");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw conflict("A user with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, isRoot: false },
  });

  sendSuccess(res, publicUser(user), 201);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw badRequest("email and password are required");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw unauthorized("Invalid email or password");
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw unauthorized("Invalid email or password");
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  // Store refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  // Set cookies
  setAuthCookies(res, accessToken, refreshToken);

  sendSuccess(res, { user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    // Delete refresh token from DB
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  // Clear client cookies
  clearAuthCookies(res);

  sendSuccess(res, { message: "Logged out successfully" });
});

export const me = asyncHandler(async (req, res) => {
  // User is already attached to req by authenticate middleware
  sendSuccess(res, req.user);
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw unauthorized("Refresh token missing");
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET || "dev-secret-change-me");
    
    // Check if refresh token is in the database and is active
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw unauthorized("Invalid or expired refresh token");
    }

    const user = storedToken.user;
    const newAccessToken = signAccessToken(user);

    // Set new access token cookie
    setAuthCookies(res, newAccessToken);

    sendSuccess(res, { user: publicUser(user) });
  } catch (error) {
    throw unauthorized("Invalid or expired refresh token");
  }
});
