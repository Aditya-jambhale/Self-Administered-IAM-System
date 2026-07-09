import asyncHandler from "../utils/asyncHandler.js";
import { forbidden } from "../utils/httpError.js";
import { userHasPermissionMember } from "../services/iamService.js";
//main middleware to check the permissions of actions 
const iampermissioncheck = (action) =>
  asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    if (req.user.isRoot) {
      return next();
    }
    //return the result if the user has the permission to perform the action
    const result = await userHasPermissionMember(req.user.id, action);

    if (!result.allowed) {
      throw forbidden(result.reason || "Access denied");
    }

    return next();
  });

export default iampermissioncheck;
