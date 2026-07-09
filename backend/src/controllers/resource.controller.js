import { sendOk, sendSuccess } from "../utils/response.js";
import { RESOURCE_ACTIONS } from "../constants/resourceActions.js";

// Handle resource endpoint requests by returning a success status
export const handleResource = (req, res) => {
  sendOk(res);
};

// Retrieve list of all resource actions with their metadata
export const getResources = (req, res) => {
  sendSuccess(res, RESOURCE_ACTIONS);
};
