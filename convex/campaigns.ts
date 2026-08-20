import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function activeOrganization(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (userId === null)
    throw new Error("You must be signed in to manage campaigns.");
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (settings?.activeOrganizationId) return settings.activeOrganizationId;
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!membership)
    throw new Error("Create an organization before setting up campaigns.");
  return membership.organizationId;
}

export const workspace = query({
  args: {},
  handler: async (ctx) => {
    const organizationId = await activeOrganization(ctx);
    const [offers, campaigns, playbooks, leadLists] = await Promise.all([
      ctx.db
        .query("offers")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId),
        )
        .collect(),
      ctx.db
        .query("campaigns")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId),
        )
        .collect(),
      ctx.db
        .query("playbooks")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId),
        )
        .collect(),
      ctx.db
        .query("leadLists")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", organizationId),
        )
        .collect(),
    ]);
    return { offers, campaigns, playbooks, leadLists };
  },
});

export const createOffer = mutation({
  args: { name: v.string(), description: v.string() },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const now = Date.now();
    if (!args.name.trim()) throw new Error("Give the offer a name.");
    return await ctx.db.insert("offers", {
      organizationId,
      name: args.name.trim(),
      description: args.description.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});
export const createPlaybook = mutation({
  args: { name: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const now = Date.now();
    if (!args.name.trim()) throw new Error("Give the playbook a name.");
    return await ctx.db.insert("playbooks", {
      organizationId,
      name: args.name.trim(),
      body: args.body.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});
export const createCampaign = mutation({
  args: {
    name: v.string(),
    offerId: v.optional(v.id("offers")),
    playbookId: v.optional(v.id("playbooks")),
    leadListIds: v.array(v.id("leadLists")),
  },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const now = Date.now();
    if (!args.name.trim()) throw new Error("Give the campaign a name.");
    return await ctx.db.insert("campaigns", {
      organizationId,
      name: args.name.trim(),
      offerId: args.offerId,
      playbookId: args.playbookId,
      leadListIds: args.leadListIds,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const renameCampaign = mutation({
  args: { campaignId: v.id("campaigns"), name: v.string() },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error("That campaign is not available.");
    if (!args.name.trim()) throw new Error("Give the campaign a name.");
    await ctx.db.patch(campaign._id, {
      name: args.name.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteCampaign = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error("That campaign is not available.");
    // Campaign-owned guidance is removed; reusable lead lists deliberately remain.
    if (campaign.offerId) await ctx.db.delete(campaign.offerId);
    if (campaign.playbookId) await ctx.db.delete(campaign.playbookId);
    const userId = await getAuthUserId(ctx);
    const settings = userId
      ? await ctx.db
          .query("userSettings")
          .withIndex("by_user", (q: any) => q.eq("userId", userId))
          .first()
      : null;
    if (settings?.activeCampaignId === campaign._id)
      await ctx.db.patch(settings._id, { activeCampaignId: undefined });
    await ctx.db.delete(campaign._id);
  },
});

export const campaignDetail = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error("That campaign is not available.");
    const [offer, playbook, listResults] = await Promise.all([
      campaign.offerId ? ctx.db.get(campaign.offerId) : null,
      campaign.playbookId ? ctx.db.get(campaign.playbookId) : null,
      Promise.all(
        (campaign.leadListIds || []).map(async (id) => {
          const list = await ctx.db.get(id);
          if (!list) return null;
          const leads = await ctx.db
            .query("leads")
            .withIndex("by_lead_list", (q) => q.eq("leadListId", id))
            .collect();
          return { list, leads };
        }),
      ),
    ]);
    const attachedLists = listResults.filter(Boolean) as {
      list: any;
      leads: any[];
    }[];
    const leadLists = attachedLists.map(({ list, leads }) => ({
      ...list,
      leadCount: leads.length,
      queuedCount: leads.filter(
        (lead) => lead.status === "queued" || lead.status === "working",
      ).length,
    }));
    const leads = attachedLists
      .flatMap(({ leads }) => leads)
      .sort((a, b) => a.importedAt - b.importedAt);
    return { campaign, offer, playbook, leadLists, leads };
  },
});

const criteria = v.array(
  v.object({
    label: v.string(),
    guidance: v.optional(v.string()),
    required: v.boolean(),
  }),
);

export const saveCampaignOffer = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    description: v.string(),
    tags: v.array(v.string()),
    idealCustomer: v.string(),
    bookingProvider: v.optional(
      v.union(v.literal("calcom"), v.literal("calendly")),
    ),
    bookingUrl: v.string(),
    qualificationCriteria: criteria,
  },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error("That campaign is not available.");
    if (!args.name.trim()) throw new Error("Give the offer a name.");
    const now = Date.now();
    const data = {
      organizationId,
      campaignId: campaign._id,
      name: args.name.trim(),
      description: args.description.trim() || undefined,
      tags: args.tags.map((tag) => tag.trim()).filter(Boolean),
      idealCustomer: args.idealCustomer.trim() || undefined,
      bookingProvider: args.bookingProvider,
      bookingUrl: args.bookingUrl.trim() || undefined,
      qualificationCriteria: args.qualificationCriteria
        .filter((item) => item.label.trim())
        .map((item) => ({
          label: item.label.trim(),
          guidance: item.guidance?.trim() || undefined,
          required: item.required,
        })),
      updatedAt: now,
    };
    if (campaign.offerId) await ctx.db.patch(campaign.offerId, data);
    else {
      const offerId = await ctx.db.insert("offers", {
        ...data,
        createdAt: now,
      });
      await ctx.db.patch(campaign._id, { offerId, updatedAt: now });
    }
  },
});

export const deleteCampaignOffer = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error("That campaign is not available.");
    if (campaign.offerId) await ctx.db.delete(campaign.offerId);
    await ctx.db.patch(campaign._id, {
      offerId: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const saveCampaignPlaybook = mutation({
  args: { campaignId: v.id("campaigns"), name: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error("That campaign is not available.");
    if (!args.name.trim() || !args.body.trim())
      throw new Error("Give the playbook a name and guidance.");
    const now = Date.now();
    if (campaign.playbookId)
      await ctx.db.patch(campaign.playbookId, {
        name: args.name.trim(),
        body: args.body.trim(),
        updatedAt: now,
      });
    else {
      const playbookId = await ctx.db.insert("playbooks", {
        organizationId,
        name: args.name.trim(),
        body: args.body.trim(),
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(campaign._id, { playbookId, updatedAt: now });
    }
  },
});

export const deleteCampaignPlaybook = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error("That campaign is not available.");
    if (campaign.playbookId) await ctx.db.delete(campaign.playbookId);
    await ctx.db.patch(campaign._id, {
      playbookId: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const setCampaignLeadLists = mutation({
  args: {
    campaignId: v.id("campaigns"),
    leadListIds: v.array(v.id("leadLists")),
  },
  handler: async (ctx, args) => {
    const organizationId = await activeOrganization(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.organizationId !== organizationId)
      throw new Error("That campaign is not available.");
    const lists = await Promise.all(
      args.leadListIds.map((id) => ctx.db.get(id)),
    );
    if (
      lists.some(
        (list) =>
          !list ||
          list.organizationId !== organizationId ||
          list.campaignId !== campaign._id,
      )
    )
      throw new Error(
        "Lead lists belong to the campaign they were imported into and cannot be reused elsewhere.",
      );
    await ctx.db.patch(campaign._id, {
      leadListIds: args.leadListIds,
      updatedAt: Date.now(),
    });
  },
});
