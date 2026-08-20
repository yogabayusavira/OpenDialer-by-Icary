import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function organizationFor(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("You must be signed in.");
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (settings?.activeOrganizationId) return settings.activeOrganizationId;
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!membership) throw new Error("Create an organization first.");
  return membership.organizationId;
}

const productFields = {
  name: v.string(),
  description: v.string(),
  whoWeAre: v.optional(v.string()),
  whoWeHelp: v.optional(v.string()),
  elevatorPitch: v.optional(v.string()),
  commonObjections: v.optional(v.string()),
  faq: v.optional(v.string()),
  trainingNotes: v.optional(v.string()),
  bookingProvider: v.optional(
    v.union(v.literal("calcom"), v.literal("calendly")),
  ),
  bookingUrl: v.optional(v.string()),
};

export const list = query({
  args: {},
  handler: async (ctx) => {
    const organizationId = await organizationFor(ctx);
    return await ctx.db
      .query("products")
      .withIndex("by_organization", (q: any) =>
        q.eq("organizationId", organizationId),
      )
      .collect();
  },
});

export const create = mutation({
  args: productFields,
  handler: async (ctx, args) => {
    const organizationId = await organizationFor(ctx);
    if (!args.name.trim()) throw new Error("Give the product a name.");
    const now = Date.now();
    return await ctx.db.insert("products", {
      organizationId,
      ...args,
      name: args.name.trim(),
      description: args.description.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: { productId: v.id("products"), ...productFields },
  handler: async (ctx, args) => {
    const organizationId = await organizationFor(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product || product.organizationId !== organizationId)
      throw new Error("Product not found.");
    const { productId, ...data } = args;
    await ctx.db.patch(productId, {
      ...data,
      name: data.name.trim(),
      description: data.description.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const organizationId = await organizationFor(ctx);
    const product = await ctx.db.get(productId);
    if (!product || product.organizationId !== organizationId)
      throw new Error("Product not found.");
    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_organization", (q: any) =>
        q.eq("organizationId", organizationId),
      )
      .collect();
    for (const campaign of campaigns)
      if (campaign.productIds?.includes(productId))
        await ctx.db.patch(campaign._id, {
          productIds: campaign.productIds.filter((id: any) => id !== productId),
          updatedAt: Date.now(),
        });
    await ctx.db.delete(productId);
  },
});

export const setCampaignProducts = mutation({
  args: {
    campaignId: v.id("campaigns"),
    productIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const organizationId = await organizationFor(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error("Campaign not found.");
    const products = await Promise.all(
      args.productIds.map((id) => ctx.db.get(id)),
    );
    if (
      products.some(
        (product) => !product || product.organizationId !== organizationId,
      )
    )
      throw new Error("Products must belong to this organization.");
    await ctx.db.patch(args.campaignId, {
      productIds: args.productIds,
      updatedAt: Date.now(),
    });
  },
});
