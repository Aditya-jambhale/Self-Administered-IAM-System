import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import authenticate from "../middleware/authenticate.js";
import asyncHandler from "../utils/asyncHandler.js";
import { badRequest, conflict, unauthorized } from "../utils/httpError.js";
import { sendSuccess } from "../utils/response.js";

const router = express.Router();

const signToken = (user) => {
  return jwt.sign(
    { sub: user.id, email: user.email, isRoot: user.isRoot },
    process.env.JWT_SECRET || "dev-secret-change-me",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
};

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isRoot: user.isRoot,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
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
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
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

    sendSuccess(res, { token: signToken(user), user: publicUser(user) });
  }),
);

router.post("/logout", (req, res) => {
  sendSuccess(res, { message: "Logged out" });
});

router.get("/me", authenticate, (req, res) => {
  sendSuccess(res, req.user);
});

export default router;
