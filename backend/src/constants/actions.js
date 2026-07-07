export const ACTIONS = Object.freeze({
  reports: [
    "reports:List",
    "reports:Read",
    "reports:Create",
    "reports:Update",
    "reports:Delete",
  ],
  alerts: [
    "alerts:List",
    "alerts:Read",
    "alerts:Create",
    "alerts:Acknowledge",
    "alerts:Delete",
  ],
  settings: ["settings:Read", "settings:Update"],
  audit: ["audit:List", "audit:Read"],
  iam: [
    "iam:ListPolicies",
    "iam:GetPolicy",
    "iam:CreatePolicy",
    "iam:UpdatePolicy",
    "iam:DeletePolicy",
    "iam:ListGroups",
    "iam:GetGroup",
    "iam:CreateGroup",
    "iam:UpdateGroup",
    "iam:DeleteGroup",
    "iam:AddUserToGroup",
    "iam:RemoveUserFromGroup",
    "iam:AttachGroupPolicy",
    "iam:DetachGroupPolicy",
    "iam:ListUsers",
    "iam:GetUser",
    "iam:AttachUserPolicy",
    "iam:DetachUserPolicy",
    "iam:PutUserBoundary",
    "iam:DeleteUserBoundary",
  ],
});

export const VALID_ACTIONS = Object.freeze(Object.values(ACTIONS).flat());
export const VALID_ACTION_SET = new Set(VALID_ACTIONS);
