import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function activeOrganization(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("You must be signed in to manage campaigns.");
  const settings = await ctx.db.query("userSettings").withIndex("by_user", (q: any) => q.eq("userId", userId)).first();
  if (settings?.activeOrganizationId) return settings.activeOrganizationId;
  const membership = await ctx.db.query("memberships").withIndex("by_user", (q: any) => q.eq("userId", userId)).first();
  if (!membership) throw new Error("Create an organization before setting up campaigns.");
  return membership.organizationId;
}

export const workspace = query({
  args: {},
  handler: async (ctx) => {
    const organizationId = await activeOrganization(ctx);
    const [offers, campaigns, playbooks, leadLists] = await Promise.all([
      ctx.db.query("offers").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("campaigns").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("playbooks").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
      ctx.db.query("leadLists").withIndex("by_organization", (q) => q.eq("organizationId", organizationId)).collect(),
    ]);
    return { offers, campaigns, playbooks, leadLists };
  },
});

export const createOffer = mutation({ args: { name: v.string(), description: v.string() }, handler: async (ctx, args) => { const organizationId = await activeOrganization(ctx); const now = Date.now(); if (!args.name.trim()) throw new Error("Give the offer a name."); return await ctx.db.insert("offers", { organizationId, name: args.name.trim(), description: args.description.trim() || undefined, createdAt: now, updatedAt: now }); } });
export const createPlaybook = mutation({ args: { name: v.string(), body: v.string() }, handler: async (ctx, args) => { const organizationId = await activeOrganization(ctx); const now = Date.now(); if (!args.name.trim()) throw new Error("Give the playbook a name."); return await ctx.db.insert("playbooks", { organizationId, name: args.name.trim(), body: args.body.trim(), createdAt: now, updatedAt: now }); } });
export const createCampaign = mutation({ args: { name: v.string(), offerId: v.optional(v.id("offers")), playbookId: v.optional(v.id("playbooks")), leadListIds: v.array(v.id("leadLists")) }, handler: async (ctx, args) => { const organizationId = await activeOrganization(ctx); const now = Date.now(); if (!args.name.trim()) throw new Error("Give the campaign a name."); return await ctx.db.insert("campaigns", { organizationId, name: args.name.trim(), offerId: args.offerId, playbookId: args.playbookId, leadListIds: args.leadListIds, status: "draft", createdAt: now, updatedAt: now }); } });
