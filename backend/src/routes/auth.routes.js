import express from "express";
import { register, login, logout, me, refresh } from "../controllers/auth.controllers.js";
import authenticate from "../middleware/auth.middleware.js";
import rateLimiter from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", rateLimiter, register);
router.post("/login", rateLimiter, login);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.post("/refresh", refresh);

export default router;
