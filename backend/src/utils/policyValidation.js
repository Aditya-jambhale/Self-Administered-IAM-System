import { VALID_ACTION_SET } from "../constants/actions.js";
import { badRequest } from "./httpError.js";

export const normalizeStatements = (input) => {
  if (Array.isArray(input)) {
    return input;
  }

  if (input && Array.isArray(input.statements)) {
    return input.statements;
  }

  return null;
};

export const getAllowActions = (statements) => {
  return [
    ...new Set(
      statements
        .filter((statement) => statement.Effect === "Allow")
        .flatMap((statement) => statement.Action),
    ),
  ];
};

export const validatePolicyStatements = (input) => {
  const statements = normalizeStatements(input);

  if (!Array.isArray(statements) || statements.length === 0) {
    throw badRequest("Policy statements must be a non-empty array");
  }

  statements.forEach((statement, index) => {
    if (!statement || typeof statement !== "object" || Array.isArray(statement)) {
      throw badRequest(`Statement ${index + 1} must be an object`);
    }

    if (!["Allow", "Deny"].includes(statement.Effect)) {
      throw badRequest(`Statement ${index + 1} Effect must be Allow or Deny`);
    }

    if (!Array.isArray(statement.Action) || statement.Action.length === 0) {
      throw badRequest(`Statement ${index + 1} Action must be a non-empty array`);
    }

    statement.Action.forEach((action) => {
      if (typeof action !== "string" || !VALID_ACTION_SET.has(action)) {
        throw badRequest(`Invalid action string: ${action}`);
      }
    });

    if (
      !Array.isArray(statement.Resource) ||
      statement.Resource.length !== 1 ||
      statement.Resource[0] !== "*"
    ) {
      throw badRequest(`Statement ${index + 1} Resource must be ["*"]`);
    }
  });

  return statements.map((statement) => ({
    Effect: statement.Effect,
    Action: [...new Set(statement.Action)],
    Resource: ["*"],
  }));
};
