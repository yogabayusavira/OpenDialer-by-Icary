import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  organizations: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    kind: v.union(v.literal("personal"), v.literal("team")),
    ownerUserId: v.id("users"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerUserId"]),
  memberships: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("manager"),
      v.literal("member"),
    ),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_organization_and_user", ["organizationId", "userId"]),
  userProfiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  offers: defineTable({
    organizationId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    name: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    idealCustomer: v.optional(v.string()),
    bookingProvider: v.optional(
      v.union(v.literal("calcom"), v.literal("calendly")),
    ),
    bookingUrl: v.optional(v.string()),
    qualificationCriteria: v.optional(
      v.array(
        v.object({
          label: v.string(),
          guidance: v.optional(v.string()),
          required: v.boolean(),
        }),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),
  campaigns: defineTable({
    organizationId: v.id("organizations"),
    offerId: v.optional(v.id("offers")),
    playbookId: v.optional(v.id("playbooks")),
    leadListIds: v.optional(v.array(v.id("leadLists"))),
    productIds: v.optional(v.array(v.id("products"))),
    bookingProvider: v.optional(
      v.union(v.literal("calcom"), v.literal("calendly")),
    ),
    bookingUrl: v.optional(v.string()),
    tableLayout: v.optional(v.any()),
    leadSchema: v.optional(v.any()),
    name: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("archived"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),
  userSettings: defineTable({
    userId: v.id("users"),
    activeOrganizationId: v.optional(v.id("organizations")),
    activeCampaignId: v.optional(v.id("campaigns")),
    activeLeadListId: v.optional(v.id("leadLists")),
    onboarding: v.object({
      sipConnected: v.boolean(),
      dismissed: v.boolean(),
    }),
  }).index("by_user", ["userId"]),
  campaignAssignments: defineTable({
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_campaign_and_user", ["campaignId", "userId"]),
  playbooks: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),
  products: defineTable({
    organizationId: v.id("organizations"),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organization", ["organizationId"]),
  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    email: v.string(),
    title: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("member")),
    invitedAt: v.number(),
  }).index("by_organization", ["organizationId"]),
  acquaintances: defineTable({
    ownerUserId: v.id("users"),
    name: v.string(),
    email: v.string(),
    status: v.union(
      v.literal("accepted"),
      v.literal("incoming"),
      v.literal("outgoing"),
    ),
    linkedin: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_owner", ["ownerUserId"]),
  organizationActivity: defineTable({
    organizationId: v.id("organizations"),
    actorUserId: v.optional(v.id("users")),
    type: v.string(),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),
  leadLists: defineTable({
    organizationId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    name: v.string(),
    source: v.union(
      v.literal("csv"),
      v.literal("manual"),
      v.literal("integration"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_campaign", ["campaignId"]),
  leads: defineTable({
    organizationId: v.id("organizations"),
    leadListId: v.id("leadLists"),
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
    notes: v.optional(v.string()),
    followUpAt: v.optional(v.number()),
    callStatus: v.optional(v.string()),
    customFields: v.optional(v.any()),
    status: v.union(
      v.literal("queued"),
      v.literal("working"),
      v.literal("completed"),
      v.literal("do_not_call"),
    ),
    importedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_lead_list", ["leadListId"])
    .index("by_organization", ["organizationId"]),
  calls: defineTable({
    organizationId: v.id("organizations"),
    campaignId: v.optional(v.id("campaigns")),
    leadId: v.optional(v.id("leads")),
    userId: v.id("users"),
    outcome: v.optional(v.string()),
    notes: v.optional(v.string()),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_lead", ["leadId"]),
});
