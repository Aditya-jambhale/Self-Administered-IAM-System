import express from "express";
import iampermissioncheck from "../middleware/iampermissioncheck.js";
import { handleResource, getResources } from "../controllers/resource.controller.js";
import { RESOURCE_ACTIONS } from "../constants/resourceActions.js";

const router = express.Router();

// Define route for retrieving resource actions metadata
router.get("/resources", getResources);

const protectedRoute = (method, path, action) => {
  router[method](path, iampermissioncheck(action), handleResource);
};

// Dynamically register routes based on the backend definition
RESOURCE_ACTIONS.forEach(({ method, path, action }) => {
  // Strip the '/api' prefix from path for backend routing
  const routePath = path.replace(/^\/api/, "");
  protectedRoute(method.toLowerCase(), routePath, action);
});

export default router;
