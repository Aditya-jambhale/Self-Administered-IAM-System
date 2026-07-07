-- CreateIndex
CREATE INDEX "UserGroupMembership_userId_idx" ON "UserGroupMembership"("userId");

-- CreateIndex
CREATE INDEX "UserGroupMembership_groupId_idx" ON "UserGroupMembership"("groupId");

-- CreateIndex
CREATE INDEX "UserPolicyAttachment_userId_idx" ON "UserPolicyAttachment"("userId");

-- CreateIndex
CREATE INDEX "UserPolicyAttachment_policyId_idx" ON "UserPolicyAttachment"("policyId");

-- CreateIndex
CREATE INDEX "GroupPolicyAttachment_groupId_idx" ON "GroupPolicyAttachment"("groupId");

-- CreateIndex
CREATE INDEX "GroupPolicyAttachment_policyId_idx" ON "GroupPolicyAttachment"("policyId");

-- CreateIndex
CREATE INDEX "UserBoundary_policyId_idx" ON "UserBoundary"("policyId");
