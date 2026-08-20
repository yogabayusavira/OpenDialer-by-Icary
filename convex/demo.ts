import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";

async function activeOrganization(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (userId === null)
    throw new Error("You must be signed in to add demo data.");
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (settings?.activeOrganizationId)
    return { userId, organizationId: settings.activeOrganizationId, settings };
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
  if (!membership)
    throw new Error("Create an organization before adding demo data.");
  return { userId, organizationId: membership.organizationId, settings };
}

const demoName = "Demo — Austin web design";
const companionSeedName = "General Outreach";

const companionProducts = [
  {
    name: "Website Development",
    description: "Conversion-led websites for local service companies.",
    tags: ["Website design", "Local SEO"],
    whoWeAre: "A hands-on web studio for service businesses.",
    whoWeHelp:
      "Owner-led Austin service businesses with an outdated website and a steady flow of local customers.",
    elevatorPitch:
      "We turn an outdated site into a clear path from search to booked work.",
    commonObjections:
      "We already have a website. / We get referrals. / It sounds expensive.",
    faq: "Typical launch: four to six weeks.",
    trainingNotes: "Ask where new work comes from before presenting the site.",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
    qualificationCriteria: [
      {
        label: "Has an active local service business",
        guidance: "Confirm the business serves a local area today.",
        required: true,
      },
      {
        label: "Can make or influence website decisions",
        guidance: "Owner, operator, or marketing lead.",
        required: true,
      },
      {
        label: "Open to improving web enquiries",
        guidance: "Interest is enough for the first meeting.",
        required: true,
      },
    ],
  },
  {
    name: "Secure Cloud Hosting",
    description: "Managed, secure hosting with a real person to call.",
    tags: ["Hosting", "Security", "Infrastructure"],
    whoWeAre: "A proactive hosting partner.",
    whoWeHelp:
      "Businesses with critical websites and no in-house infrastructure team.",
    elevatorPitch:
      "We keep the website fast, secure, backed up, and looked after.",
    commonObjections:
      "Our current host is cheap. / We have never had an issue.",
    faq: "Migration is planned and handled for the client.",
    trainingNotes: "Lead with risk reduction, not technical detail.",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
    qualificationCriteria: [
      {
        label: "Has an active website or web app",
        guidance: "Must have an existing live property.",
        required: true,
      },
      {
        label: "Decision maker for IT / hosting",
        guidance: "Owner or technical lead.",
        required: true,
      },
    ],
  },
  {
    name: "AI Voice Receptionist",
    description:
      "An always-on phone receptionist that captures and routes every caller.",
    tags: ["AI", "Voice", "Automation"],
    whoWeAre: "Practical AI automation for busy service teams.",
    whoWeHelp: "Companies missing after-hours and overflow calls.",
    elevatorPitch:
      "Every caller gets an immediate answer and the right next step, even after hours.",
    commonObjections: "Customers want a human. / We already use voicemail.",
    faq: "It can route urgent calls and book meetings.",
    trainingNotes: "Ask about missed calls, voicemail, and after-hours cover.",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
    qualificationCriteria: [
      {
        label: "Receives inbound customer phone calls",
        guidance: "Needs call volume to benefit.",
        required: true,
      },
      {
        label: "Missing calls after hours or on weekends",
        guidance: "Identify the pain point.",
        required: false,
      },
    ],
  },
  {
    name: "Review Management Platform",
    description:
      "A simple system for generating and responding to customer reviews.",
    whoWeAre: "A reputation workflow built for local businesses.",
    whoWeHelp:
      "Service companies that need a steadier stream of five-star reviews.",
    elevatorPitch:
      "We make asking for a review part of the completed-job workflow.",
    commonObjections: "We already ask customers. / We do not have enough time.",
    faq: "Review requests can be automated after service completion.",
    trainingNotes: "Ask how reviews are requested today.",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
  {
    name: "Local SEO Boost",
    description:
      "Local search visibility for businesses that need more qualified enquiries.",
    whoWeAre: "A local visibility partner.",
    whoWeHelp: "Businesses competing in crowded service markets.",
    elevatorPitch:
      "We improve the signals that help local buyers find and choose the business.",
    commonObjections: "SEO takes too long. / We tried it before.",
    faq: "Work focuses on maps, site relevance, and local authority.",
    trainingNotes:
      "Talk about service area and search demand, not rankings alone.",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
  {
    name: "Patient Booking Funnels",
    description:
      "Landing pages and follow-up flows that turn more enquiries into appointments.",
    whoWeAre: "A patient acquisition and booking team.",
    whoWeHelp: "Clinics with enquiry volume but inconsistent bookings.",
    elevatorPitch:
      "We remove friction between an interested visitor and a confirmed appointment.",
    commonObjections: "Our reception team handles it. / We already advertise.",
    faq: "Funnels can connect to existing calendars and CRMs.",
    trainingNotes: "Ask where interested patients currently drop off.",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
];

const companionCampaigns = [
  [
    "General Outreach",
    [0, 1, 3],
    [
      "Apex Plumbing Solutions",
      "Beacon Electric & Lighting",
      "Horizon Painters Ltd",
      "Ironwood Iron Works",
      "Oakwood Cabinetry",
    ],
  ],
  [
    "Texas Roofers",
    [0, 4],
    [
      "Crown Roofers",
      "Lone Star Roofing",
      "Alamo City Roof",
      "DFW Shingle",
      "Highland Park Roofing",
    ],
  ],
  [
    "Dental Clinics",
    [5, 2, 3],
    [
      "BrightSmile Dental",
      "Harbour Dental Care",
      "Maple Grove Dentistry",
      "Parkside Orthodontics",
      "West End Dental",
    ],
  ],
  [
    "Australian Electricians",
    [0, 4, 1],
    [
      "Sydney Spark Electrical",
      "Melbourne Power Co.",
      "Coastal Electrical",
      "Brisbane Switchboard",
      "Adelaide Electric Works",
    ],
  ],
  [
    "Miami HVAC",
    [2, 0, 4],
    [
      "Cool Breeze HVAC",
      "Miami Air Experts",
      "Oceanfront Cooling",
      "Coral Gables HVAC",
      "South Beach Climate",
    ],
  ],
  [
    "California Landscaping",
    [3, 0],
    [
      "Golden State Landscaping",
      "Pacific Garden Works",
      "Redwood Outdoor Living",
      "Sierra Green Care",
      "Coastal Lawn Studio",
    ],
  ],
  [
    "Pacific Northwest Solar",
    [0, 4, 1],
    [
      "Cascade Solar Power",
      "Olympic Clean Energy",
      "Puget Sound SunWorks",
      "Evergreen Solar Co.",
      "Rainier Renewable",
    ],
  ],
  [
    "Austin Web Design",
    [0, 4],
    [
      "Austin Crafted Homes",
      "Barton Springs Legal",
      "Zilker Fitness Studio",
      "South Congress Architecture",
      "Rainey Hospitality",
    ],
  ],
] as const;

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, organizationId, settings } = await activeOrganization(ctx);
    const existing = await ctx.db
      .query("campaigns")
      .withIndex("by_organization", (q: any) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q: any) => q.eq(q.field("name"), demoName))
      .first();
    if (existing) return { campaignId: existing._id, created: false };

    const now = Date.now();
    const offerId = await ctx.db.insert("offers", {
      organizationId,
      name: "Websites that turn local searches into booked work",
      description:
        "A practical website and local-search refresh for established service businesses.",
      tags: ["Website design", "Local SEO"],
      idealCustomer:
        "Owner-led Austin service businesses with an outdated website and a steady flow of local customers.",
      bookingProvider: "calcom",
      bookingUrl: "https://cal.com",
      qualificationCriteria: [
        {
          label: "Has an active local service business",
          guidance: "Confirm the business serves a local area today.",
          required: true,
        },
        {
          label: "Can make or influence website decisions",
          guidance: "Owner, operator, or marketing lead.",
          required: true,
        },
        {
          label: "Open to improving web enquiries",
          guidance: "Interest is enough for the first meeting.",
          required: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    });
    const playbookId = await ctx.db.insert("playbooks", {
      organizationId,
      name: "Austin service business opener",
      body: "Open with a brief local observation. Ask how new customers currently find them, then whether their website creates enough enquiries. If there is a clear opportunity, qualify and offer the calendar.",
      createdAt: now,
      updatedAt: now,
    });
    const campaignId = await ctx.db.insert("campaigns", {
      organizationId,
      name: demoName,
      offerId,
      playbookId,
      leadListIds: [],
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(offerId, { campaignId });
    const leadListId = await ctx.db.insert("leadLists", {
      organizationId,
      campaignId,
      name: "Austin service businesses — demo",
      source: "manual",
      createdAt: now,
      updatedAt: now,
    });
    const leads = [
      [
        "Maya",
        "Ortiz",
        "Maya's Plumbing Co.",
        "Owner",
        "+1 (512) 555-0142",
        "Plumbing",
        "Austin, TX",
        "4.8",
        "https://www.google.com/maps/search/?api=1&query=Maya%27s+Plumbing+Austin",
      ],
      [
        "Noah",
        "Bennett",
        "Bennett Electric",
        "Operations manager",
        "+1 (512) 555-0188",
        "Electrical",
        "Austin, TX",
        "4.6",
        "https://www.google.com/maps/search/?api=1&query=Bennett+Electric+Austin",
      ],
      [
        "Priya",
        "Shah",
        "Hill Country Roofing",
        "Co-owner",
        "+1 (512) 555-0194",
        "Roofing",
        "Round Rock, TX",
        "4.7",
        "https://www.google.com/maps/search/?api=1&query=Hill+Country+Roofing+Austin",
      ],
      [
        "Jordan",
        "Lee",
        "Greenline Landscaping",
        "Founder",
        "+1 (512) 555-0163",
        "Landscaping",
        "Austin, TX",
        "4.5",
        "https://www.google.com/maps/search/?api=1&query=Greenline+Landscaping+Austin",
      ],
      [
        "Elena",
        "Park",
        "Cedar & Stone HVAC",
        "General manager",
        "+1 (512) 555-0116",
        "HVAC",
        "Austin, TX",
        "4.9",
        "https://www.google.com/maps/search/?api=1&query=Cedar+and+Stone+HVAC+Austin",
      ],
      [
        "Marcus",
        "Hill",
        "Lone Star Glass",
        "Owner",
        "+1 (512) 555-0177",
        "Glazing",
        "Austin, TX",
        "4.4",
        "https://www.google.com/maps/search/?api=1&query=Lone+Star+Glass+Austin",
      ],
    ] as const;
    for (const [
      firstName,
      lastName,
      company,
      title,
      phone,
      industry,
      location,
      rating,
      googleMapsUrl,
    ] of leads) {
      await ctx.db.insert("leads", {
        organizationId,
        leadListId,
        firstName,
        lastName,
        company,
        title,
        phone,
        industry,
        location,
        rating,
        googleMapsUrl,
        status: "queued",
        importedAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.patch(campaignId, {
      leadListIds: [leadListId],
      updatedAt: now,
    });
    if (settings)
      await ctx.db.patch(settings._id, {
        activeCampaignId: campaignId,
        activeLeadListId: leadListId,
      });
    else
      await ctx.db.insert("userSettings", {
        userId,
        activeOrganizationId: organizationId,
        activeCampaignId: campaignId,
        activeLeadListId: leadListId,
        onboarding: { sipConnected: false, dismissed: false },
      });
    return { campaignId, created: true };
  },
});

export const seedCallCompanion = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, organizationId } = await activeOrganization(ctx);
    const exists = await ctx.db
      .query("campaigns")
      .withIndex("by_organization", (q: any) =>
        q.eq("organizationId", organizationId),
      )
      .filter((q: any) => q.eq(q.field("name"), companionSeedName))
      .first();
    if (exists) return { created: false, campaignId: exists._id };
    const now = Date.now();
    const productIds = [] as any[];
    for (const product of companionProducts)
      productIds.push(
        await ctx.db.insert("products", {
          organizationId,
          ...product,
          createdAt: now,
          updatedAt: now,
        }),
      );
    let firstCampaignId: any;
    let firstLeadListId: any;
    for (
      let campaignIndex = 0;
      campaignIndex < companionCampaigns.length;
      campaignIndex += 1
    ) {
      const [name, indices, companies] = companionCampaigns[campaignIndex];
      const offerId = await ctx.db.insert("offers", {
        organizationId,
        name: `${name} qualification`,
        description: "Qualification and booking guidance for this campaign.",
        tags: indices.map((index) => companionProducts[index].name),
        idealCustomer:
          "A decision maker with an active need and a relevant business.",
        bookingProvider: "calcom",
        bookingUrl: "https://cal.com",
        qualificationCriteria: [
          { label: "Fits the campaign audience", required: true },
          { label: "Can influence the decision", required: true },
          { label: "Open to a follow-up meeting", required: false },
        ],
        createdAt: now,
        updatedAt: now,
      });
      const playbookId = await ctx.db.insert("playbooks", {
        organizationId,
        name: `${name} call playbook`,
        body: "Open with a relevant observation. Learn how the prospect handles this today. Establish a clear reason to continue, qualify the opportunity, then offer a short calendar meeting.",
        createdAt: now,
        updatedAt: now,
      });
      const campaignId = await ctx.db.insert("campaigns", {
        organizationId,
        name,
        offerId,
        playbookId,
        leadListIds: [],
        productIds: indices.map((index) => productIds[index]),
        bookingProvider: "calcom",
        bookingUrl: "https://cal.com",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(offerId, { campaignId });
      const leadListId = await ctx.db.insert("leadLists", {
        organizationId,
        campaignId,
        name: `${name} prospects`,
        source: "manual",
        createdAt: now,
        updatedAt: now,
      });
      for (let i = 0; i < companies.length; i += 1) {
        const company = companies[i];
        const city =
          campaignIndex === 1
            ? "Dallas, TX"
            : campaignIndex === 3
              ? "Sydney, AU"
              : campaignIndex === 4
                ? "Miami, FL"
                : campaignIndex === 5
                  ? "Sacramento, CA"
                  : campaignIndex === 6
                    ? "Seattle, WA"
                    : campaignIndex === 2
                      ? "Denver, CO"
                      : "Austin, TX";
        const callStatuses = [
          "Not Called",
          "Callback",
          "Skip",
          "Busy",
          "Interested",
        ];
        await ctx.db.insert("leads", {
          organizationId,
          leadListId,
          company,
          firstName: ["Alex", "Jamie", "Taylor", "Morgan", "Riley"][i],
          lastName: ["Davis", "Chen", "Smith", "Lee", "Brown"][i],
          title: i % 2 ? "Operations Manager" : "Owner",
          phone: `+1 (${210 + campaignIndex * 31}) 555-${String(1400 + campaignIndex * 10 + i).padStart(4, "0")}`,
          industry: companionProducts[indices[0]].name,
          location: city,
          website: `https://www.google.com/search?q=${encodeURIComponent(company)}`,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${company} ${city}`)}`,
          rating: (4.1 + i / 10).toFixed(1),
          notes:
            i === 1 ? "Asked for a callback after the current job." : undefined,
          followUpAt: i === 1 ? now + 86400000 : undefined,
          callStatus: callStatuses[i],
          customFields: { source: "Call Companion workspace", campaign: name },
          status: i === 2 ? "do_not_call" : i === 4 ? "completed" : "queued",
          importedAt: now,
          updatedAt: now,
        });
      }
      await ctx.db.patch(campaignId, {
        leadListIds: [leadListId],
        updatedAt: now,
      });
      if (!firstCampaignId) {
        firstCampaignId = campaignId;
        firstLeadListId = leadListId;
      }
    }
    const roster = [
      [
        "Olivia Martin",
        "olivia@agencycoalition.com",
        "Campaign manager",
        "owner",
      ],
      ["Marcus Rivera", "marcus@agencycoalition.com", "Sales lead", "member"],
      [
        "Sofia Patel",
        "sofia@agencycoalition.com",
        "Account executive",
        "member",
      ],
    ] as const;
    for (const [name, email, title, role] of roster)
      await ctx.db.insert("organizationMembers", {
        organizationId,
        name,
        email,
        title,
        role,
        invitedAt: now,
      });
    for (const [name, email] of [
      ["David Smith", "david@example.com"],
      ["Emma Watson", "emma@example.com"],
      ["Frank Wright", "frank@example.com"],
    ])
      await ctx.db.insert("acquaintances", {
        ownerUserId: userId,
        name,
        email,
        status: "accepted",
        createdAt: now,
      });
    for (const message of [
      "Website Development was added to the product catalog.",
      "General Outreach campaign was activated.",
      "Texas Roofers leads were imported.",
      "Marcus Rivera joined the organization.",
    ])
      await ctx.db.insert("organizationActivity", {
        organizationId,
        actorUserId: userId,
        type: "workspace_update",
        message,
        createdAt: now,
      });
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    if (settings)
      await ctx.db.patch(settings._id, {
        activeCampaignId: firstCampaignId,
        activeLeadListId: firstLeadListId,
      });
    return { created: true, campaignId: firstCampaignId };
  },
});
