import express from "express";
import { register, login, logout, me, refresh } from "../controllers/auth.controllers.js";
import authenticate from "../middleware/authenticate.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authenticate, me);
router.post("/refresh", refresh);

export default router;
