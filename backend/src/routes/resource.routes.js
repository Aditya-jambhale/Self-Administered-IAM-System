import express from "express";
import iampermissioncheck from "../middleware/iampermissioncheck.js";
import { sendOk } from "../utils/response.js";

const router = express.Router();

const protectedRoute = (method, path, action) => {
  router[method](path, iampermissioncheck(action), (req, res) => sendOk(res));
};

protectedRoute("get", "/reports", "reports:List");
protectedRoute("get", "/reports/:id", "reports:Read");
protectedRoute("post", "/reports", "reports:Create");
protectedRoute("put", "/reports/:id", "reports:Update");
protectedRoute("delete", "/reports/:id", "reports:Delete");

protectedRoute("get", "/alerts", "alerts:List");
protectedRoute("get", "/alerts/:id", "alerts:Read");
protectedRoute("post", "/alerts", "alerts:Create");
protectedRoute("patch", "/alerts/:id/acknowledge", "alerts:Acknowledge");
protectedRoute("delete", "/alerts/:id", "alerts:Delete");

protectedRoute("get", "/settings", "settings:Read");
protectedRoute("put", "/settings", "settings:Update");

protectedRoute("get", "/audit", "audit:List");
protectedRoute("get", "/audit/:id", "audit:Read");

export default router;
