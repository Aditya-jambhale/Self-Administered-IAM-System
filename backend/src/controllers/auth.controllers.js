import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { badRequest, conflict, unauthorized } from "../utils/httpError.js";
import { sendSuccess } from "../utils/response.js";

const isProduction = process.env.NODE_ENV === "production";

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const generateRandomToken = () => {
  return crypto.randomBytes(40).toString("hex");
};

const signAccessToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, isRoot: user.isRoot },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { expiresIn: "15m" }
  );
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
};

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
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
//new user 
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    throw badRequest("name, email, and password are required");
  }

  // Strong password complexity validation: minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  if (!passwordRegex.test(password)) {
    throw badRequest("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#).");
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
  const rawRefreshToken = generateRandomToken();
  const hashedRefreshToken = hashToken(rawRefreshToken);

  // Store hashed refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({
    data: {
      token: hashedRefreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  // Set secure cookies
  setAuthCookies(res, accessToken, rawRefreshToken);

  sendSuccess(res, { user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    const hashed = hashToken(refreshToken);
    // Delete refresh token from DB
    await prisma.refreshToken.deleteMany({
      where: { token: hashed },
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

  const hashed = hashToken(refreshToken);

  // Check if refresh token is in the database and is active
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: hashed },
    include: { user: true },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
    // If the token is invalid/compromised, clear cookies and reject
    clearAuthCookies(res);
    throw unauthorized("Invalid or expired refresh token");
  }

  const user = storedToken.user;

  // Perform Refresh Token Rotation (RTR)
  // 1. Delete the old refresh token from database
  await prisma.refreshToken.deleteMany({
    where: { token: hashed },
  });

  // 2. Generate new set of tokens
  const newAccessToken = signAccessToken(user);
  const newRawRefreshToken = generateRandomToken();
  const newHashedRefreshToken = hashToken(newRawRefreshToken);

  // 3. Save new hashed refresh token in database
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await prisma.refreshToken.create({
    data: {
      token: newHashedRefreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  // 4. Set rotated cookies
  setAuthCookies(res, newAccessToken, newRawRefreshToken);

  sendSuccess(res, { user: publicUser(user) });
});
