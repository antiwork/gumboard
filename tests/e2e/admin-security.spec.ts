import { test, expect } from "../fixtures/test-helpers";

test.describe("Admin Security - Prevent Organization Lockout", () => {
  test.describe("Admin Self-Demotion Protection", () => {
    test("should prevent last admin from demoting themselves", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Setup: Make test user the ONLY admin
      await testPrisma.user.update({
        where: { id: testContext.userId },
        data: { isAdmin: true },
      });

      // Ensure no other admins exist
      await testPrisma.user.updateMany({
        where: {
          organizationId: testContext.organizationId,
          id: { not: testContext.userId },
        },
        data: { isAdmin: false },
      });

      // Attempt to demote self via API
      const response = await authenticatedPage.request.put(
        `/api/organization/members/${testContext.userId}`,
        {
          data: { isAdmin: false },
        }
      );

      // Should be blocked with 400 status
      expect(response.status()).toBe(400);

      const responseBody = await response.json();
      expect(responseBody.error).toContain("Cannot remove admin privileges from the last admin");

      // Verify user is still admin
      const user = await testPrisma.user.findUnique({
        where: { id: testContext.userId },
      });
      expect(user?.isAdmin).toBe(true);
    });

    test("should allow admin to demote themselves when other admins exist", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Setup: Create another admin user
      const otherUser = await testPrisma.user.create({
        data: {
          email: "other-admin@test.com",
          name: "Other Admin",
          organizationId: testContext.organizationId,
          isAdmin: true,
        },
      });

      // Make test user admin too
      await testPrisma.user.update({
        where: { id: testContext.userId },
        data: { isAdmin: true },
      });

      // Now test user should be able to demote themselves
      const response = await authenticatedPage.request.put(
        `/api/organization/members/${testContext.userId}`,
        {
          data: { isAdmin: false },
        }
      );

      expect(response.status()).toBe(200);

      // Verify user is no longer admin
      const user = await testPrisma.user.findUnique({
        where: { id: testContext.userId },
      });
      expect(user?.isAdmin).toBe(false);

      // Verify other admin still exists
      const otherAdmin = await testPrisma.user.findUnique({
        where: { id: otherUser.id },
      });
      expect(otherAdmin?.isAdmin).toBe(true);

      // Cleanup
      await testPrisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  test.describe("Admin Removal Protection", () => {
    test("should prevent removal of last admin", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Setup: Create a target admin user (different from test user) with unique email
      const uniqueEmail = `target-admin-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
      const targetAdmin = await testPrisma.user.create({
        data: {
          email: uniqueEmail,
          name: "Target Admin",
          organizationId: testContext.organizationId,
          isAdmin: true,
        },
      });

      // Make test user admin (so they can perform the action)
      await testPrisma.user.update({
        where: { id: testContext.userId },
        data: { isAdmin: true },
      });

      // Ensure target is the ONLY other admin
      await testPrisma.user.updateMany({
        where: {
          organizationId: testContext.organizationId,
          id: { not: targetAdmin.id },
        },
        data: { isAdmin: false },
      });

      // Now make target the ONLY admin by demoting test user
      await testPrisma.user.update({
        where: { id: testContext.userId },
        data: { isAdmin: false },
      });

      // Make test user admin to test the protection
      await testPrisma.user.update({
        where: { id: testContext.userId },
        data: { isAdmin: true },
      });

      // Attempt to remove the last admin
      const response = await authenticatedPage.request.delete(
        `/api/organization/members/${targetAdmin.id}`
      );

      expect(response.status()).toBe(400);

      const responseBody = await response.json();
      expect(responseBody.error).toContain("Cannot remove the last admin");

      // Verify target admin still exists
      const admin = await testPrisma.user.findUnique({
        where: { id: targetAdmin.id },
      });
      expect(admin).toBeTruthy();
      expect(admin?.isAdmin).toBe(true);

      // Cleanup
      await testPrisma.user.delete({ where: { id: targetAdmin.id } });
    });

    test("should allow removal of admin when other admins exist", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Setup: Create target admin and another admin with unique emails
      const uniqueEmail1 = `target-admin-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
      const targetAdmin = await testPrisma.user.create({
        data: {
          email: uniqueEmail1,
          name: "Target Admin",
          organizationId: testContext.organizationId,
          isAdmin: true,
        },
      });

      const uniqueEmail2 = `other-admin-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
      const otherAdmin = await testPrisma.user.create({
        data: {
          email: uniqueEmail2,
          name: "Other Admin",
          organizationId: testContext.organizationId,
          isAdmin: true,
        },
      });

      // Make test user admin
      await testPrisma.user.update({
        where: { id: testContext.userId },
        data: { isAdmin: true },
      });

      // Should be able to remove target admin since others exist
      const response = await authenticatedPage.request.delete(
        `/api/organization/members/${targetAdmin.id}`
      );

      expect(response.status()).toBe(200);

      // Verify target admin was removed
      const removedAdmin = await testPrisma.user.findUnique({
        where: { id: targetAdmin.id },
      });
      expect(removedAdmin).toBeNull();

      // Verify other admin still exists
      const remainingAdmin = await testPrisma.user.findUnique({
        where: { id: otherAdmin.id },
      });
      expect(remainingAdmin?.isAdmin).toBe(true);

      // Cleanup
      await testPrisma.user.delete({ where: { id: otherAdmin.id } });
    });
  });

  test.describe("Non-Admin Protection", () => {
    test("should prevent non-admin from promoting themselves", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Setup: Ensure test user is NOT admin
      await testPrisma.user.update({
        where: { id: testContext.userId },
        data: { isAdmin: false },
      });

      // Create an admin user so organization has at least one admin
      const adminUser = await testPrisma.user.create({
        data: {
          email: "admin@test.com",
          name: "Admin User",
          organizationId: testContext.organizationId,
          isAdmin: true,
        },
      });

      // Attempt to promote self to admin
      const response = await authenticatedPage.request.put(
        `/api/organization/members/${testContext.userId}`,
        {
          data: { isAdmin: true },
        }
      );

      // Should be blocked with 403 status (non-admin trying to change roles)
      expect(response.status()).toBe(403);

      const responseBody = await response.json();
      expect(responseBody.error).toContain("Only admins can change member roles");

      // Verify user is still not admin
      const user = await testPrisma.user.findUnique({
        where: { id: testContext.userId },
      });
      expect(user?.isAdmin).toBe(false);

      // Cleanup
      await testPrisma.user.delete({ where: { id: adminUser.id } });
    });
  });

  test.describe("Valid Admin Operations", () => {
    test("should allow admin to promote regular users", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Setup: Create a regular user
      const regularUser = await testPrisma.user.create({
        data: {
          email: "regular@test.com",
          name: "Regular User",
          organizationId: testContext.organizationId,
          isAdmin: false,
        },
      });

      // Make test user admin
      await testPrisma.user.update({
        where: { id: testContext.userId },
        data: { isAdmin: true },
      });

      // Promote regular user to admin
      const response = await authenticatedPage.request.put(
        `/api/organization/members/${regularUser.id}`,
        {
          data: { isAdmin: true },
        }
      );

      expect(response.status()).toBe(200);

      // Verify user is now admin
      const promotedUser = await testPrisma.user.findUnique({
        where: { id: regularUser.id },
      });
      expect(promotedUser?.isAdmin).toBe(true);

      // Cleanup
      await testPrisma.user.delete({ where: { id: regularUser.id } });
    });

    test("should allow admin to demote other admins when multiple admins exist", async ({
      authenticatedPage,
      testContext,
      testPrisma,
    }) => {
      // Setup: Create another admin
      const otherAdmin = await testPrisma.user.create({
        data: {
          email: "other-admin@test.com",
          name: "Other Admin",
          organizationId: testContext.organizationId,
          isAdmin: true,
        },
      });

      // Make test user admin
      await testPrisma.user.update({
        where: { id: testContext.userId },
        data: { isAdmin: true },
      });

      // Demote other admin
      const response = await authenticatedPage.request.put(
        `/api/organization/members/${otherAdmin.id}`,
        {
          data: { isAdmin: false },
        }
      );

      expect(response.status()).toBe(200);

      // Verify other user is no longer admin
      const demotedUser = await testPrisma.user.findUnique({
        where: { id: otherAdmin.id },
      });
      expect(demotedUser?.isAdmin).toBe(false);

      // Verify test user is still admin
      const testUser = await testPrisma.user.findUnique({
        where: { id: testContext.userId },
      });
      expect(testUser?.isAdmin).toBe(true);

      // Cleanup
      await testPrisma.user.delete({ where: { id: otherAdmin.id } });
    });
  });
});
