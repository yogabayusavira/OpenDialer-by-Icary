import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const importedLead = v.object({
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  company: v.optional(v.string()),
  title: v.optional(v.string()),
  industry: v.optional(v.string()),
  location: v.optional(v.string()),
  website: v.optional(v.string()),
  googleMapsUrl: v.optional(v.string()),
  rating: v.optional(v.string()),
});

async function activeOrganizationId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (userId === null)
    throw new Error("You must be signed in to manage lead lists.");
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (settings?.activeOrganizationId)
    return { userId, organizationId: settings.activeOrganizationId };
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!membership)
    throw new Error("Create an organization before importing leads.");
  return { userId, organizationId: membership.organizationId };
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await activeOrganizationId(ctx);
    const lists = await ctx.db
      .query("leadLists")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .collect();
    return await Promise.all(
      lists.map(async (list) => ({
        ...list,
        leadCount: (
          await ctx.db
            .query("leads")
            .withIndex("by_lead_list", (q) => q.eq("leadListId", list._id))
            .collect()
        ).length,
      })),
    );
  },
});

export const importCsv = mutation({
  args: {
    name: v.string(),
    campaignId: v.id("campaigns"),
    leads: v.array(importedLead),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await activeOrganizationId(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error(
        "Open the campaign that should own these leads before importing.",
      );
    const name = args.name.trim();
    if (!name) throw new Error("Give this lead list a name before importing.");
    if (args.leads.length === 0)
      throw new Error("We could not find any leads in that CSV file.");
    const now = Date.now();
    const leadListId = await ctx.db.insert("leadLists", {
      organizationId,
      campaignId: campaign._id,
      name,
      source: "csv",
      createdAt: now,
      updatedAt: now,
    });
    for (const lead of args.leads) {
      await ctx.db.insert("leads", {
        organizationId,
        leadListId,
        ...lead,
        status: "queued",
        importedAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(campaign._id, {
      leadListIds: [...(campaign.leadListIds || []), leadListId],
      updatedAt: now,
    });
    return leadListId;
  },
});

export const rename = mutation({
  args: { leadListId: v.id("leadLists"), name: v.string() },
  handler: async (ctx, args) => {
    const { organizationId } = await activeOrganizationId(ctx);
    const list = await ctx.db.get(args.leadListId);
    if (!list || list.organizationId !== organizationId)
      throw new Error("That lead list is not available.");
    if (!args.name.trim()) throw new Error("Give the lead list a name.");
    await ctx.db.patch(list._id, {
      name: args.name.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { leadListId: v.id("leadLists") },
  handler: async (ctx, args) => {
    const { organizationId } = await activeOrganizationId(ctx);
    const list = await ctx.db.get(args.leadListId);
    if (!list || list.organizationId !== organizationId)
      throw new Error("That lead list is not available.");
    const [leads, campaigns] = await Promise.all([
      ctx.db
        .query("leads")
        .withIndex("by_lead_list", (q) => q.eq("leadListId", list._id))
        .collect(),
      ctx.db
        .query("campaigns")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId),
        )
        .collect(),
    ]);
    for (const campaign of campaigns) {
      if (campaign.leadListIds?.includes(list._id))
        await ctx.db.patch(campaign._id, {
          leadListIds: campaign.leadListIds.filter((id) => id !== list._id),
          updatedAt: Date.now(),
        });
    }
    for (const lead of leads) await ctx.db.delete(lead._id);
    await ctx.db.delete(list._id);
  },
});
