import asyncHandler from "../utils/asyncHandler.js";
import { forbidden } from "../utils/httpError.js";
import { userHasPermission } from "../services/iamService.js";

const requireIam = (action) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (req.user.isRoot) {
      return next();
    }

    const result = await userHasPermission(req.user.id, action);

    if (!result.allowed) {
      throw forbidden(result.reason || "Access denied");
    }

    return next();
  });

export default requireIam;
