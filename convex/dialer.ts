import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function currentWorkspace(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("You must be signed in to use the dialer.");
  const settings = await ctx.db.query("userSettings").withIndex("by_user", (q: any) => q.eq("userId", userId)).first();
  const membership = settings?.activeOrganizationId
    ? { organizationId: settings.activeOrganizationId }
    : await ctx.db.query("memberships").withIndex("by_user", (q: any) => q.eq("userId", userId)).first();
  if (!membership) throw new Error("Create an organization before using the dialer.");
  return { userId, organizationId: membership.organizationId, settings };
}

async function campaignLeadCount(ctx: any, campaign: any) {
  const listIds = campaign.leadListIds || [];
  const counts = await Promise.all(listIds.map(async (leadListId: any) =>
    (await ctx.db.query("leads").withIndex("by_lead_list", (q: any) => q.eq("leadListId", leadListId)).collect()).filter((lead: any) => lead.status === "queued" || lead.status === "working").length,
  ));
  return counts.reduce((total: number, count: number) => total + count, 0);
}

export const workspace = query({
  args: {},
  handler: async (ctx) => {
    const { organizationId, settings } = await currentWorkspace(ctx);
    const campaigns = await ctx.db.query("campaigns").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect();
    const campaignSummaries = await Promise.all(campaigns.map(async (campaign) => ({ ...campaign, leadCount: await campaignLeadCount(ctx, campaign) })));
    const activeCampaignDocument = settings?.activeCampaignId ? await ctx.db.get(settings.activeCampaignId as Id<"campaigns">) : null;
    const activeCampaign = activeCampaignDocument ? { ...activeCampaignDocument, leadCount: await campaignLeadCount(ctx, activeCampaignDocument) } : null;
    const listIds = activeCampaign?.leadListIds || [];
    const lists = await Promise.all(listIds.map((leadListId) => ctx.db.get(leadListId)));
    const listNameById = new Map(lists.filter(Boolean).map((list: any) => [list._id, list.name]));
    const leadGroups = await Promise.all(listIds.map((leadListId) => ctx.db.query("leads").withIndex("by_lead_list", (q) => q.eq("leadListId", leadListId)).collect()));
    const leads = leadGroups.flat().filter((lead) => lead.status === "queued" || lead.status === "working").map((lead) => ({
      ...lead,
      listName: listNameById.get(lead.leadListId) || "Lead list",
    }));
    const activeOffer = activeCampaign?.offerId ? await ctx.db.get(activeCampaign.offerId) : null;
    return { campaigns: campaignSummaries, activeCampaign, activeOffer, leads };
  },
});

export const setActiveCampaign = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const { userId, settings } = await currentWorkspace(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("That campaign is not available.");
    const membership = await ctx.db.query("memberships").withIndex("by_organization_and_user", (q: any) => q.eq("organizationId", campaign.organizationId).eq("userId", userId)).first();
    if (!membership) throw new Error("You do not have access to that campaign.");
    if (!campaign.leadListIds?.length) throw new Error("Add at least one lead list before starting this campaign.");
    const now = Date.now();
    await ctx.db.patch(args.campaignId, { status: "active", updatedAt: now });
    if (settings) await ctx.db.patch(settings._id, { activeOrganizationId: campaign.organizationId, activeCampaignId: args.campaignId });
    else await ctx.db.insert("userSettings", { userId, activeOrganizationId: campaign.organizationId, activeCampaignId: args.campaignId, onboarding: { sipConnected: false, dismissed: false } });
  },
});

export const myCampaigns = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await currentWorkspace(ctx);
    const assignments = await ctx.db.query("campaignAssignments").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const selected = await Promise.all(assignments.map(async (assignment) => {
      const campaign = await ctx.db.get(assignment.campaignId);
      if (!campaign) return null;
      const [organization, leadCount] = await Promise.all([ctx.db.get(campaign.organizationId), campaignLeadCount(ctx, campaign)]);
      return { ...campaign, leadCount, organizationName: organization?.name || "Organization" };
    }));
    return selected.filter((campaign): campaign is NonNullable<typeof campaign> => campaign !== null);
  },
});

export const addToMyCampaigns = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const { userId } = await currentWorkspace(ctx);
    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign) throw new Error("That campaign is not available.");
    const membership = await ctx.db.query("memberships").withIndex("by_organization_and_user", (q: any) => q.eq("organizationId", campaign.organizationId).eq("userId", userId)).first();
    if (!membership) throw new Error("You do not have access to that campaign.");
    const existing = await ctx.db.query("campaignAssignments").withIndex("by_campaign_and_user", (q) => q.eq("campaignId", campaign._id).eq("userId", userId)).first();
    if (!existing) await ctx.db.insert("campaignAssignments", { campaignId: campaign._id, userId, createdAt: Date.now() });
  },
});

export const removeFromMyCampaigns = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const { userId } = await currentWorkspace(ctx);
    const assignment = await ctx.db.query("campaignAssignments").withIndex("by_campaign_and_user", (q) => q.eq("campaignId", args.campaignId).eq("userId", userId)).first();
    if (assignment) await ctx.db.delete(assignment._id);
  },
});

export const recordOutcome = mutation({
  args: { campaignId: v.id("campaigns"), leadId: v.id("leads"), outcome: v.string(), notes: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId, organizationId } = await currentWorkspace(ctx);
    const [campaign, lead] = await Promise.all([ctx.db.get(args.campaignId), ctx.db.get(args.leadId)]);
    if (!campaign || campaign.organizationId !== organizationId || !lead || lead.organizationId !== organizationId) throw new Error("This lead is no longer available in your queue.");
    const now = Date.now();
    await ctx.db.insert("calls", { organizationId, campaignId: campaign._id, leadId: lead._id, userId, outcome: args.outcome, notes: args.notes?.trim() || undefined, startedAt: now, endedAt: now });
    await ctx.db.patch(lead._id, { status: args.outcome === "Do not call" ? "do_not_call" : "completed", updatedAt: now });
  },
});

export const home = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await currentWorkspace(ctx);
    // Home is a rep's personal rollup: it deliberately spans every organization
    // and campaign this signed-in user has worked in.
    const calls = (await ctx.db.query("calls").withIndex("by_user", (q) => q.eq("userId", userId)).collect())
      .sort((a, b) => b.startedAt - a.startedAt);
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const today = calls.filter((call) => call.startedAt >= dayStart.getTime());
    const daily = Array.from({ length: 7 }, (_, index) => {
      const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (6 - index));
      const end = new Date(start); end.setDate(end.getDate() + 1);
      const dayCalls = calls.filter((call) => call.startedAt >= start.getTime() && call.startedAt < end.getTime());
      return { label: start.toLocaleDateString("en-US", { weekday: "short" }), calls: dayCalls.length, answers: dayCalls.filter((call) => call.outcome !== "Do not call").length };
    });
    const recent = await Promise.all(calls.slice(0, 5).map(async (call) => {
      const [lead, campaign] = await Promise.all([call.leadId ? ctx.db.get(call.leadId) : null, call.campaignId ? ctx.db.get(call.campaignId) : null]);
      return { ...call, leadName: [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") || lead?.company || "Unknown lead", campaignName: campaign?.name || "Campaign" };
    }));
    return {
      callsToday: today.length,
      completedToday: today.filter((call) => call.outcome !== "Do not call").length,
      meetingsToday: today.filter((call) => call.outcome === "Meeting booked").length,
      daily,
      recent,
    };
  },
});
