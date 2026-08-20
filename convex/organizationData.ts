import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function context(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("You must be signed in.");
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  const membership = settings?.activeOrganizationId
    ? null
    : await ctx.db
        .query("memberships")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
  const organizationId =
    settings?.activeOrganizationId || membership?.organizationId;
  if (!organizationId) throw new Error("Create an organization first.");
  return { userId, organizationId };
}

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await context(ctx);
    const [organization, campaigns, products, members, activity] =
      await Promise.all([
        ctx.db.get(organizationId),
        ctx.db
          .query("campaigns")
          .withIndex("by_organization", (q: any) =>
            q.eq("organizationId", organizationId),
          )
          .collect(),
        ctx.db
          .query("products")
          .withIndex("by_organization", (q: any) =>
            q.eq("organizationId", organizationId),
          )
          .collect(),
        ctx.db
          .query("organizationMembers")
          .withIndex("by_organization", (q: any) =>
            q.eq("organizationId", organizationId),
          )
          .collect(),
        ctx.db
          .query("organizationActivity")
          .withIndex("by_organization", (q: any) =>
            q.eq("organizationId", organizationId),
          )
          .order("desc")
          .take(20),
      ]);
    return { organization, campaigns, products, members, activity };
  },
});
export const members = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await context(ctx);
    return await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q: any) =>
        q.eq("organizationId", organizationId),
      )
      .collect();
  },
});
export const activity = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await context(ctx);
    return await ctx.db
      .query("organizationActivity")
      .withIndex("by_organization", (q: any) =>
        q.eq("organizationId", organizationId),
      )
      .order("desc")
      .collect();
  },
});
export const inviteMember = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    title: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await context(ctx);
    const id = await ctx.db.insert("organizationMembers", {
      organizationId,
      ...args,
      invitedAt: Date.now(),
    });
    await ctx.db.insert("organizationActivity", {
      organizationId,
      type: "member_invited",
      message: `${args.name} was invited to the organization.`,
      createdAt: Date.now(),
    });
    return id;
  },
});
export const removeMember = mutation({
  args: { memberId: v.id("organizationMembers") },
  handler: async (ctx, { memberId }) => {
    const { organizationId } = await context(ctx);
    const member = await ctx.db.get(memberId);
    if (!member || member.organizationId !== organizationId)
      throw new Error("Member not found.");
    await ctx.db.delete(memberId);
  },
});
export const acquaintances = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await context(ctx);
    return await ctx.db
      .query("acquaintances")
      .withIndex("by_owner", (q: any) => q.eq("ownerUserId", userId))
      .collect();
  },
});
export const addAcquaintance = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    linkedin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await context(ctx);
    return await ctx.db.insert("acquaintances", {
      ownerUserId: userId,
      ...args,
      status: "outgoing",
      createdAt: Date.now(),
    });
  },
});
export const updateAcquaintance = mutation({
  args: {
    acquaintanceId: v.id("acquaintances"),
    status: v.union(
      v.literal("accepted"),
      v.literal("incoming"),
      v.literal("outgoing"),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await context(ctx);
    const item = await ctx.db.get(args.acquaintanceId);
    if (!item || item.ownerUserId !== userId)
      throw new Error("Acquaintance not found.");
    await ctx.db.patch(item._id, { status: args.status });
  },
});
export const removeAcquaintance = mutation({
  args: { acquaintanceId: v.id("acquaintances") },
  handler: async (ctx, { acquaintanceId }) => {
    const { userId } = await context(ctx);
    const item = await ctx.db.get(acquaintanceId);
    if (!item || item.ownerUserId !== userId)
      throw new Error("Acquaintance not found.");
    await ctx.db.delete(acquaintanceId);
  },
});
