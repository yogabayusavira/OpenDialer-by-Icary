import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const accountName = (user: { name?: string; email?: string } | null) =>
  user?.name?.trim() || user?.email?.split("@")[0] || "My";

export const ensurePersonalOrganization = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in to create an organization.");

    const existingMembership = await ctx.db
      .query("memberships")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingMembership) {
      const settings = await ctx.db.query("userSettings").withIndex("by_user", (q) => q.eq("userId", userId)).first();
      if (!settings) {
        await ctx.db.insert("userSettings", {
          userId,
          activeOrganizationId: existingMembership.organizationId,
          onboarding: { sipConnected: false, dismissed: false },
        });
      }
      return existingMembership.organizationId;
    }

    const user = await ctx.db.get(userId);
    const name = user?.name?.trim() || user?.email?.split("@")[0] || "Personal";
    const now = Date.now();
    const organizationId = await ctx.db.insert("organizations", {
      name: `${name}'s Personal`,
      kind: "personal",
      ownerUserId: userId,
      createdAt: now,
    });
    await ctx.db.insert("memberships", { organizationId, userId, role: "owner", createdAt: now });
    await ctx.db.insert("userSettings", {
      userId,
      activeOrganizationId: organizationId,
      onboarding: { sipConnected: false, dismissed: false },
    });
    return organizationId;
  },
});

export const onboardingState = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    const membership = await ctx.db.query("memberships").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    const settings = await ctx.db.query("userSettings").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    const profile = await ctx.db.query("userProfiles").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    const organization = membership ? await ctx.db.get(membership.organizationId) : null;
    const authUser = user as { name?: string; email?: string; image?: string } | null;
    return {
      complete: settings?.onboarding.dismissed ?? false,
      profile: { displayName: profile?.displayName || accountName(authUser), title: profile?.title || "", image: authUser?.image || null },
      organizationName: organization?.name || `${accountName(authUser)}'s workspace`,
    };
  },
});

export const completeOnboarding = mutation({
  args: { displayName: v.string(), title: v.string(), organizationName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in to finish onboarding.");
    const displayName = args.displayName.trim();
    const organizationName = args.organizationName.trim();
    if (!displayName) throw new Error("Enter the name you want teammates to see.");
    if (!organizationName) throw new Error("Name your organization to continue.");
    const now = Date.now();
    const existingMembership = await ctx.db.query("memberships").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    let organizationId = existingMembership?.organizationId;
    if (organizationId) await ctx.db.patch(organizationId, { name: organizationName });
    else {
      organizationId = await ctx.db.insert("organizations", { name: organizationName, kind: "personal", ownerUserId: userId, createdAt: now });
      await ctx.db.insert("memberships", { organizationId, userId, role: "owner", createdAt: now });
    }
    const profile = await ctx.db.query("userProfiles").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (profile) await ctx.db.patch(profile._id, { displayName, title: args.title.trim(), updatedAt: now });
    else await ctx.db.insert("userProfiles", { userId, displayName, title: args.title.trim(), createdAt: now, updatedAt: now });
    const settings = await ctx.db.query("userSettings").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (settings) await ctx.db.patch(settings._id, { activeOrganizationId: organizationId, onboarding: { sipConnected: false, dismissed: true } });
    else await ctx.db.insert("userSettings", { userId, activeOrganizationId: organizationId, onboarding: { sipConnected: false, dismissed: true } });
    return organizationId;
  },
});

export const updateProfile = mutation({
  args: { displayName: v.string(), title: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("You must be signed in to update your profile.");
    const displayName = args.displayName.trim();
    if (!displayName) throw new Error("Enter the name you want teammates to see.");
    const now = Date.now();
    const profile = await ctx.db.query("userProfiles").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    if (profile) await ctx.db.patch(profile._id, { displayName, title: args.title.trim(), updatedAt: now });
    else await ctx.db.insert("userProfiles", { userId, displayName, title: args.title.trim(), createdAt: now, updatedAt: now });
  },
});

export const currentOrganization = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const settings = await ctx.db.query("userSettings").withIndex("by_user", (q) => q.eq("userId", userId)).first();
    return settings?.activeOrganizationId ? await ctx.db.get(settings.activeOrganizationId) : null;
  },
});
