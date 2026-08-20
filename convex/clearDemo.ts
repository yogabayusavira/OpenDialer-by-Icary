import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";

// Run via CLI: npx convex run clearDemo:clearAll '{"organizationId":"<id>"}'
// organizationId is optional — if omitted, deletes ALL data across ALL orgs (dev only).
export const clearAll = mutation({
  args: { organizationId: v.optional(v.id("organizations")) },
  handler: async (ctx, { organizationId }) => {
    const tables = [
      "leads",
      "leadLists",
      "offers",
      "playbooks",
      "campaigns",
      "products",
      "organizationActivity",
      "organizationMembers",
    ] as const;

    const counts: Record<string, number> = {};

    for (const table of tables) {
      const rows = organizationId
        ? await ctx.db
            .query(table)
            .withIndex("by_organization", (q: any) =>
              q.eq("organizationId", organizationId),
            )
            .collect()
        : await ctx.db.query(table).collect();

      for (const row of rows) await ctx.db.delete(row._id);
      counts[table] = rows.length;
    }

    return { deleted: counts };
  },
});
