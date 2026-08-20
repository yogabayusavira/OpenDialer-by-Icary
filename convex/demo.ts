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
      "Owner-led service businesses with an outdated website and a steady flow of local customers.",
    elevatorPitch:
      "We turn an outdated site into a clear path from search to booked work.",
    commonObjections:
      "We already have a website. / We get referrals. / It sounds expensive.",
    faq: "Typical launch: four to six weeks. We handle copy, design, and dev.",
    trainingNotes:
      "Ask where new work comes from before presenting the site. If they say referrals, that's the opening.",
    playbook:
      "1. Introduction: Hi [Lead Name], this is [Your Name] with [Company]. I noticed your site while researching local service providers in the area.\n2. Problem Discovery: When prospective clients search for your services today, are you satisfied with how many convert directly into calls and bookings?\n3. Value Proposition: We help owner-led businesses revamp their outdated web presence into a high-converting channel that drives qualified leads directly onto your calendar.\n4. Close: Would you have 15 minutes this Thursday to walk through a quick audit of your current web presence?",
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
    whoWeAre: "A proactive hosting partner, not a ticket queue.",
    whoWeHelp:
      "Businesses with critical websites and no in-house infrastructure team.",
    elevatorPitch:
      "We keep the website fast, secure, backed up, and looked after 24/7.",
    commonObjections:
      "Our current host is cheap. / We have never had an issue. / We use Godaddy.",
    faq: "Migration is planned and fully handled. Average migration time is 48 hours.",
    trainingNotes:
      "Lead with risk reduction, not technical detail. Ask about their last downtime incident.",
    playbook:
      "1. Introduction: Hi [Lead Name], I'm calling from [Company] regarding your web infrastructure and hosting security.\n2. Discovery: When was the last time your website's disaster recovery and server speed were benchmarked?\n3. Value: We provide fully managed, high-speed cloud infrastructure with 24/7 uptime monitoring and a dedicated contact number.\n4. Close: Can I send you a 1-page comparison and schedule a 10-minute check-in next week?",
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
      "Every caller gets an immediate answer and the right next step, even at 2 AM.",
    commonObjections:
      "Customers want a human. / We already use voicemail. / It will feel robotic.",
    faq: "The voice sounds natural. It can route urgent calls and book meetings live.",
    trainingNotes:
      "Ask about missed calls, voicemail, and after-hours cover. Volume matters.",
    playbook:
      "1. Introduction: Hi [Lead Name], I'm reaching out because many service companies lose up to 30% of potential leads when calls go to voicemail after 5 PM.\n2. Discovery: How does your team currently handle incoming calls during peak hours or weekends?\n3. Solution: Our AI Voice Receptionist answers instantly, qualifies the caller, and books the appointment directly into your calendar without hiring full-time staff.\n4. Next Step: Let's do a live 3-minute test call so you can hear how natural it sounds. How does tomorrow at 10 AM sound?",
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
    tags: ["Reputation", "Reviews", "Local SEO"],
    whoWeAre: "A reputation workflow built for local businesses.",
    whoWeHelp:
      "Service companies that need a steadier stream of five-star reviews.",
    elevatorPitch:
      "We make asking for a review part of the completed-job workflow automatically.",
    commonObjections:
      "We already ask customers. / We do not have enough time. / Reviews come naturally.",
    faq: "Review requests can be automated after service completion via SMS or email.",
    trainingNotes: "Ask how reviews are requested today and what their Google rating is.",
    playbook:
      "1. Hi [Lead Name], I'm with [Company]. We work with local service businesses to build their online reputation consistently.\n2. Quick question — after you complete a job, do you have a repeatable system for capturing a Google review from that customer?\n3. Most businesses we talk to say they mean to ask but rarely do. Our platform sends a review request automatically once a job is marked complete.\n4. Could I show you how it works in a 10-minute demo this week?",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
  {
    name: "Local SEO Boost",
    description:
      "Local search visibility for businesses that need more qualified enquiries.",
    tags: ["SEO", "Google Maps", "Local Search"],
    whoWeAre: "A local visibility partner.",
    whoWeHelp: "Businesses competing in crowded service markets.",
    elevatorPitch:
      "We improve the signals that help local buyers find and choose the business.",
    commonObjections:
      "SEO takes too long. / We tried it before. / We run ads instead.",
    faq: "Work focuses on Google Business Profile, site relevance, and local citations.",
    trainingNotes:
      "Talk about service area and search demand, not rankings alone. Pull up their GBP live.",
    playbook:
      "1. Hi [Lead Name], I'm [Your Name] from [Company]. I was looking at local search results for [industry] in [city] and noticed [Company Name] doesn't appear in the top results.\n2. When someone searches for [service] near them today, what does your visibility look like?\n3. We run a focused local SEO program — Google Business Profile, citations, and relevance signals — that typically moves businesses into the map pack within 90 days.\n4. Can I walk you through a free visibility audit on a quick call this week?",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
  {
    name: "Patient Booking Funnels",
    description:
      "Landing pages and follow-up flows that turn more enquiries into appointments.",
    tags: ["Healthcare", "Booking", "Lead Nurture"],
    whoWeAre: "A patient acquisition and booking team.",
    whoWeHelp: "Clinics with enquiry volume but inconsistent bookings.",
    elevatorPitch:
      "We remove friction between an interested visitor and a confirmed appointment.",
    commonObjections:
      "Our reception team handles it. / We already advertise. / Our CRM does this.",
    faq: "Funnels can connect to existing calendars, EHR systems, and CRMs.",
    trainingNotes:
      "Ask where interested patients currently drop off. Form submissions, phone calls, or walk-ins?",
    playbook:
      "1. Hi [Lead Name], I'm calling from [Company]. We help clinics and practices convert more of their inbound enquiries into booked appointments.\n2. When a patient reaches out — whether via your website, ads, or social — what happens next?\n3. We build a guided booking flow that follows up automatically if they don't complete the booking, reducing the number of leads that fall through.\n4. Would a 15-minute walkthrough of how we set this up for a practice similar to yours be useful?",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
  {
    name: "CRM & Pipeline Automation",
    description: "Sales pipelines and automated follow-up sequences for service teams.",
    tags: ["CRM", "Automation", "Sales Ops"],
    whoWeAre: "A sales operations team for growing service businesses.",
    whoWeHelp: "Teams losing deals in the follow-up gap after the first call.",
    elevatorPitch:
      "We set up the follow-up cadences so your team closes more of the leads they already have.",
    commonObjections:
      "We use spreadsheets. / We have a CRM but don't use it. / Too complex.",
    faq: "Setup takes 2 weeks. We import existing contacts and configure sequences for you.",
    trainingNotes:
      "Ask how many leads they follow up with more than once. Most say rarely.",
    playbook:
      "1. Hi [Lead Name], I'm [Your Name] from [Company].\n2. Quick question — of the leads your team speaks with each week, what percentage get a structured second or third follow-up?\n3. Most growing service businesses lose 40–60% of warm leads simply because there's no follow-up system. We build that in GoHighLevel or HubSpot and train your team on it.\n4. Can we set up a 20-minute call to look at your current pipeline stage?",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
  {
    name: "Paid Ads Management",
    description: "Google and Meta ad campaigns managed for consistent lead flow.",
    tags: ["Google Ads", "Meta Ads", "Lead Generation"],
    whoWeAre: "A performance ad team specialising in local service leads.",
    whoWeHelp: "Businesses that need a consistent, trackable flow of new enquiries.",
    elevatorPitch:
      "We run the ads, optimise the spend, and report exactly what each lead cost.",
    commonObjections:
      "Ads are expensive. / We tried it and it didn't work. / We don't have the budget.",
    faq: "Minimum ad spend: $1,500/month. Management fee is separate. ROI tracked from day one.",
    trainingNotes:
      "Ask what they've tried before. Bad past experience with ads is common — position as a different approach.",
    playbook:
      "1. Hi [Lead Name], this is [Your Name] from [Company].\n2. Are you currently running any Google or Meta ads for [business type]?\n3. Whether that's a yes or no, there's a good chance the targeting and landing page setup is leaving money on the table. We specialise in service business ads with a cost-per-lead guarantee.\n4. Would you be open to a quick audit of your current ad spend or a proposal for a starter campaign?",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
  {
    name: "Business Phone System (VoIP)",
    description:
      "A modern cloud phone system with call routing, recording, and analytics.",
    tags: ["VoIP", "Phone", "Communications"],
    whoWeAre: "A VoIP provider built for small and mid-size service businesses.",
    whoWeHelp: "Businesses still on landlines or juggling personal cell numbers.",
    elevatorPitch:
      "One business number, shared across the team, with full call recording and reporting.",
    commonObjections:
      "We've always used our mobiles. / We have a landline. / It sounds complicated.",
    faq: "Full setup takes 1 business day. Number porting included at no cost.",
    trainingNotes:
      "Ask if calls are tracked or recorded today. Most aren't — that's the value gap.",
    playbook:
      "1. Hi [Lead Name], I'm calling from [Company] about your business phone setup.\n2. Do you currently have a way to see call volume, record calls, or route customers to the right team member automatically?\n3. Most service businesses we speak with are still using personal numbers or a basic landline. We replace that with a full cloud system for around the cost of a mobile plan.\n4. Could I send over a comparison and set up a 10-minute walkthrough?",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
  {
    name: "Staff Training & Onboarding Portal",
    description:
      "A branded online portal for onboarding, SOPs, and team training videos.",
    tags: ["Training", "HR", "Onboarding"],
    whoWeAre: "An onboarding and training platform for trade and service businesses.",
    whoWeHelp: "Growing businesses struggling to scale consistent quality with new hires.",
    elevatorPitch:
      "Your SOPs, training videos, and quizzes in one branded portal — new hires get consistent training every time.",
    commonObjections:
      "We train on the job. / We don't have time to create content. / We're too small.",
    faq: "We build the portal with you in 3 weeks using your existing documentation.",
    trainingNotes:
      "Ask about their hiring frequency and how they currently onboard. Pain is usually in inconsistency.",
    playbook:
      "1. Hi [Lead Name], I'm from [Company].\n2. When you hire a new technician or service rep today, how long before they're working independently — and is that process consistent every time?\n3. We build a branded staff portal with your SOPs, process videos, and onboarding checklists so every new hire gets the same experience, regardless of who trains them.\n4. Would you be open to a quick demo?",
    bookingProvider: "calcom" as const,
    bookingUrl: "https://cal.com",
  },
];

// [campaignName, productIndices, leads: [firstName, lastName, company, title, phone, industry, location, rating, notes?, callStatus?]]
const companionCampaigns: Array<[
  string,
  number[],
  Array<[string, string, string, string, string, string, string, string, string?, string?]>,
]> = [
  [
    "General Outreach",
    [0, 1, 3],
    [
      ["Maya", "Ortiz", "Apex Plumbing Solutions", "Owner", "+1 (512) 555-0142", "Plumbing", "Austin, TX", "4.8", undefined, "Not Called"],
      ["Noah", "Bennett", "Beacon Electric & Lighting", "Operations Manager", "+1 (512) 555-0188", "Electrical", "Austin, TX", "4.6", "Asked for callback after current project wraps up.", "Callback"],
      ["Priya", "Shah", "Hill Country Roofing", "Co-Owner", "+1 (512) 555-0194", "Roofing", "Round Rock, TX", "4.7", undefined, "Interested"],
      ["Jordan", "Lee", "Greenline Landscaping", "Founder", "+1 (512) 555-0163", "Landscaping", "Austin, TX", "4.5", undefined, "Not Called"],
      ["Elena", "Park", "Cedar & Stone HVAC", "General Manager", "+1 (512) 555-0116", "HVAC", "Austin, TX", "4.9", "Very interested. Wants a proposal by Friday.", "Interested"],
      ["Marcus", "Hill", "Lone Star Glass", "Owner", "+1 (512) 555-0177", "Glazing", "Austin, TX", "4.4", undefined, "Busy"],
      ["Sofia", "Reyes", "Reyes Tile & Stone", "Owner", "+1 (512) 555-0209", "Flooring", "Austin, TX", "4.7", undefined, "Not Called"],
      ["Liam", "Nguyen", "Nguyen Painting Co.", "Operations Lead", "+1 (512) 555-0231", "Painting", "Cedar Park, TX", "4.5", undefined, "Skip"],
      ["Aisha", "Thompson", "Thompson Pest Control", "Owner", "+1 (512) 555-0247", "Pest Control", "Pflugerville, TX", "4.8", "Left voicemail. Will try again Thursday.", "Callback"],
      ["Ethan", "Morales", "Morales Concrete Works", "Founder", "+1 (512) 555-0258", "Concrete", "Kyle, TX", "4.3", undefined, "Not Called"],
      ["Chloe", "Davis", "Davis Fencing & Gates", "Owner", "+1 (512) 555-0261", "Fencing", "Manor, TX", "4.6", undefined, "Not Called"],
      ["James", "Kim", "Kim Pool Services", "Owner", "+1 (512) 555-0279", "Pool Services", "Lakeway, TX", "4.9", "Referral from Priya Shah.", "Interested"],
    ],
  ],
  [
    "Texas Roofers",
    [0, 4],
    [
      ["Brandon", "Cruz", "Crown Roofers", "Owner", "+1 (214) 555-0101", "Roofing", "Dallas, TX", "4.7", undefined, "Not Called"],
      ["Tiffany", "Wallace", "Lone Star Roofing", "Sales Manager", "+1 (214) 555-0114", "Roofing", "Fort Worth, TX", "4.5", "Mentioned they just lost a major contract. Good timing.", "Interested"],
      ["Derek", "Burns", "Alamo City Roof", "Owner", "+1 (210) 555-0128", "Roofing", "San Antonio, TX", "4.6", undefined, "Busy"],
      ["Michelle", "Green", "DFW Shingle Pros", "Owner", "+1 (972) 555-0135", "Roofing", "Plano, TX", "4.4", undefined, "Not Called"],
      ["Carlos", "Vega", "Highland Park Roofing", "GM", "+1 (214) 555-0149", "Roofing", "Dallas, TX", "4.8", undefined, "Callback"],
      ["Natalie", "Brooks", "Brooks Storm Repair", "Owner", "+1 (817) 555-0153", "Roofing", "Arlington, TX", "4.3", "In the middle of storm season. Very busy but interested.", "Callback"],
      ["Kevin", "Diaz", "Rio Grande Roofing", "Founder", "+1 (956) 555-0162", "Roofing", "McAllen, TX", "4.6", undefined, "Not Called"],
      ["Rachel", "Flores", "Gulf Coast Roofing", "Co-Owner", "+1 (713) 555-0175", "Roofing", "Houston, TX", "4.7", undefined, "Not Called"],
      ["Tony", "Marshall", "Marshall Metal Roofs", "Owner", "+1 (214) 555-0181", "Roofing", "Garland, TX", "4.5", "Interested in SEO component specifically.", "Interested"],
      ["Vanessa", "Torres", "Torres Flat Roofing", "Owner", "+1 (210) 555-0196", "Roofing", "New Braunfels, TX", "4.4", undefined, "Skip"],
      ["Chris", "Nguyen", "Nguyen Roofing & Gutters", "Owner", "+1 (281) 555-0204", "Roofing", "Sugar Land, TX", "4.6", undefined, "Not Called"],
      ["Amber", "Hayes", "Bayou Roofing Co.", "Operations Lead", "+1 (713) 555-0211", "Roofing", "Katy, TX", "4.5", undefined, "Not Called"],
    ],
  ],
  [
    "Dental Clinics",
    [5, 2, 3],
    [
      ["Dr. Sarah", "Chen", "BrightSmile Dental", "Practice Owner", "+1 (303) 555-0101", "Dentistry", "Denver, CO", "4.9", "Very engaged. Wants to reduce no-shows.", "Interested"],
      ["Dr. James", "Okafor", "Harbour Dental Care", "Principal Dentist", "+1 (303) 555-0115", "Dentistry", "Aurora, CO", "4.7", undefined, "Not Called"],
      ["Lisa", "Tanaka", "Maple Grove Dentistry", "Practice Manager", "+1 (720) 555-0122", "Dentistry", "Lakewood, CO", "4.8", "Asked about EHR integration specifically.", "Callback"],
      ["Dr. Paul", "Morrison", "Parkside Orthodontics", "Owner", "+1 (303) 555-0138", "Orthodontics", "Denver, CO", "4.6", undefined, "Busy"],
      ["Dr. Amara", "Patel", "West End Dental", "Clinical Director", "+1 (720) 555-0144", "Dentistry", "Westminster, CO", "4.7", undefined, "Not Called"],
      ["Greg", "Walsh", "Walsh Family Dental", "Practice Manager", "+1 (303) 555-0157", "Dentistry", "Englewood, CO", "4.5", undefined, "Not Called"],
      ["Dr. Keiko", "Yamamoto", "Smile Studio CO", "Owner", "+1 (303) 555-0163", "Cosmetic Dentistry", "Denver, CO", "5.0", "Top-rated in area. Very selective about vendors.", "Interested"],
      ["Renee", "Dumont", "Dumont Dental Group", "Operations Director", "+1 (720) 555-0171", "Dentistry", "Arvada, CO", "4.4", undefined, "Skip"],
      ["Dr. Marcus", "Webb", "Webb Implant Center", "Owner", "+1 (303) 555-0189", "Implants", "Denver, CO", "4.8", "Runs a high-ticket implant practice. Ideal ICP.", "Interested"],
      ["Tara", "Johnson", "Johnson Pediatric Dental", "Owner", "+1 (720) 555-0195", "Pediatric Dentistry", "Centennial, CO", "4.9", "Referral from a current client.", "Callback"],
      ["Dr. Amir", "Hassan", "ClearPath Orthodontics", "Founder", "+1 (303) 555-0202", "Orthodontics", "Denver, CO", "4.6", undefined, "Not Called"],
    ],
  ],
  [
    "Australian Electricians",
    [0, 4, 1],
    [
      ["Lachlan", "Murphy", "Sydney Spark Electrical", "Director", "+61 (2) 9555-0101", "Electrical", "Sydney, NSW", "4.8", undefined, "Not Called"],
      ["Bridgette", "O'Brien", "Melbourne Power Co.", "Owner", "+61 (3) 9555-0114", "Electrical", "Melbourne, VIC", "4.6", "Was referred by a mutual contact.", "Interested"],
      ["Tyson", "Clarke", "Coastal Electrical", "Operations Manager", "+61 (7) 5555-0121", "Electrical", "Gold Coast, QLD", "4.5", undefined, "Busy"],
      ["Emma", "Sutherland", "Brisbane Switchboard", "Owner", "+61 (7) 3555-0138", "Electrical", "Brisbane, QLD", "4.7", "Looking to grow their commercial division.", "Callback"],
      ["Callum", "Henderson", "Adelaide Electric Works", "Owner", "+61 (8) 8555-0145", "Electrical", "Adelaide, SA", "4.4", undefined, "Not Called"],
      ["Jessica", "Nguyen", "Nguyen Electrical Pty", "Founder", "+61 (3) 9555-0152", "Electrical", "Melbourne, VIC", "4.9", "Fastest growing electrical co. in their suburb.", "Interested"],
      ["Riley", "Thompson", "Thompson Solar & Electric", "Director", "+61 (2) 9555-0168", "Solar & Electrical", "Parramatta, NSW", "4.7", undefined, "Not Called"],
      ["Mia", "Wilson", "Wilson Electrical Group", "GM", "+61 (8) 8555-0174", "Electrical", "Perth, WA", "4.6", undefined, "Not Called"],
      ["Nathan", "Baker", "Baker Fault Finders", "Owner", "+61 (7) 3555-0181", "Electrical", "Ipswich, QLD", "4.3", undefined, "Skip"],
      ["Olivia", "Price", "Price Power Solutions", "Owner", "+61 (2) 4555-0192", "Electrical", "Newcastle, NSW", "4.8", "Keen on the SEO package for more commercial jobs.", "Interested"],
    ],
  ],
  [
    "Miami HVAC",
    [2, 0, 4],
    [
      ["Diego", "Ramirez", "Cool Breeze HVAC", "Owner", "+1 (305) 555-0101", "HVAC", "Miami, FL", "4.8", "Handles 200+ service calls per month.", "Interested"],
      ["Patricia", "Gomez", "Miami Air Experts", "General Manager", "+1 (786) 555-0112", "HVAC", "Hialeah, FL", "4.6", undefined, "Not Called"],
      ["Roberto", "Santos", "Oceanfront Cooling", "Founder", "+1 (305) 555-0127", "HVAC", "Miami Beach, FL", "4.7", "Missed the first call. Left voicemail.", "Callback"],
      ["Camila", "Mendez", "Coral Gables HVAC", "Owner", "+1 (305) 555-0134", "HVAC", "Coral Gables, FL", "4.9", "Very interested. Wants a full demo.", "Interested"],
      ["Luis", "Herrera", "South Beach Climate", "Owner", "+1 (786) 555-0148", "HVAC", "South Beach, FL", "4.5", undefined, "Busy"],
      ["Ana", "Castillo", "Castillo Air Services", "Operations Lead", "+1 (954) 555-0156", "HVAC", "Doral, FL", "4.6", undefined, "Not Called"],
      ["Marco", "Diaz", "Diaz Mechanical", "Director", "+1 (305) 555-0163", "HVAC", "Kendall, FL", "4.4", undefined, "Skip"],
      ["Isabella", "Ramos", "Ramos Climate Control", "Owner", "+1 (786) 555-0177", "HVAC", "Aventura, FL", "4.7", "Runs a residential + commercial mixed operation.", "Interested"],
      ["Felipe", "Torres", "Torres HVAC & Plumbing", "Co-Owner", "+1 (305) 555-0182", "HVAC", "Cutler Bay, FL", "4.5", undefined, "Not Called"],
      ["Gabriela", "Vega", "Vega Air Solutions", "Owner", "+1 (786) 555-0191", "HVAC", "Homestead, FL", "4.6", undefined, "Not Called"],
      ["Ricardo", "Fuentes", "Fuentes Cooling Pros", "Founder", "+1 (305) 555-0205", "HVAC", "Miami Lakes, FL", "4.8", "Looking for a web upgrade after losing a bid.", "Callback"],
    ],
  ],
  [
    "California Landscaping",
    [3, 0],
    [
      ["Tyler", "Nguyen", "Golden State Landscaping", "Owner", "+1 (916) 555-0101", "Landscaping", "Sacramento, CA", "4.7", undefined, "Not Called"],
      ["Hannah", "Kim", "Pacific Garden Works", "Operations Manager", "+1 (415) 555-0113", "Landscaping", "Oakland, CA", "4.5", "Reached out via our website first.", "Interested"],
      ["Blake", "Johnson", "Redwood Outdoor Living", "Founder", "+1 (530) 555-0119", "Landscaping", "Roseville, CA", "4.8", undefined, "Not Called"],
      ["Zoe", "Martinez", "Sierra Green Care", "Owner", "+1 (559) 555-0127", "Landscaping", "Fresno, CA", "4.6", undefined, "Busy"],
      ["Austin", "White", "Coastal Lawn Studio", "Owner", "+1 (831) 555-0134", "Landscaping", "Santa Cruz, CA", "4.9", "High-end residential. Perfect ICP.", "Interested"],
      ["Brooke", "Anderson", "Anderson Irrigation", "GM", "+1 (714) 555-0142", "Irrigation", "Anaheim, CA", "4.4", undefined, "Not Called"],
      ["Caden", "Williams", "Williams Hardscaping", "Director", "+1 (626) 555-0155", "Landscaping", "Pasadena, CA", "4.7", "Interested in review management platform.", "Callback"],
      ["Sydney", "Davis", "Davis Turf & Sod", "Owner", "+1 (760) 555-0162", "Turf", "Palm Desert, CA", "4.5", undefined, "Not Called"],
      ["Preston", "Miller", "Miller Tree Service", "Owner", "+1 (510) 555-0178", "Tree Service", "Fremont, CA", "4.6", undefined, "Skip"],
      ["Haley", "Wilson", "Wilson Garden Design", "Founder", "+1 (925) 555-0185", "Garden Design", "Walnut Creek, CA", "4.8", "Referred by a current client in the East Bay.", "Interested"],
      ["Garrett", "Moore", "Moore Lawn Care", "Owner", "+1 (209) 555-0194", "Lawn Care", "Stockton, CA", "4.3", undefined, "Not Called"],
    ],
  ],
  [
    "Pacific Northwest Solar",
    [0, 4, 1],
    [
      ["Connor", "Murphy", "Cascade Solar Power", "CEO", "+1 (206) 555-0101", "Solar", "Seattle, WA", "4.8", "Running a 12-person install team. Scaling fast.", "Interested"],
      ["Alexis", "Sullivan", "Olympic Clean Energy", "Founder", "+1 (253) 555-0114", "Solar", "Tacoma, WA", "4.6", undefined, "Not Called"],
      ["Brendan", "Walsh", "Puget Sound SunWorks", "Owner", "+1 (360) 555-0122", "Solar", "Olympia, WA", "4.7", "Reached out about digital presence first.", "Callback"],
      ["Megan", "O'Connor", "Evergreen Solar Co.", "GM", "+1 (503) 555-0131", "Solar", "Portland, OR", "4.5", undefined, "Busy"],
      ["Sean", "Ryan", "Rainier Renewable", "Director", "+1 (425) 555-0139", "Solar", "Bellevue, WA", "4.9", "Premium installer. Wants premium website to match.", "Interested"],
      ["Fiona", "Kelly", "Kelly Solar Group", "Owner", "+1 (971) 555-0147", "Solar", "Beaverton, OR", "4.6", undefined, "Not Called"],
      ["Patrick", "Gallagher", "Pacific Volt Solar", "Founder", "+1 (206) 555-0155", "Solar", "Renton, WA", "4.4", undefined, "Not Called"],
      ["Siobhan", "Burke", "Burke Clean Power", "Owner", "+1 (503) 555-0162", "Solar", "Salem, OR", "4.7", "Won a large commercial contract — expanding.", "Interested"],
      ["Declan", "Flynn", "Flynn Energy Solutions", "Director", "+1 (360) 555-0174", "Solar", "Bellingham, WA", "4.5", undefined, "Skip"],
      ["Niamh", "Brady", "Brady Solar & Battery", "Co-Owner", "+1 (425) 555-0181", "Solar", "Kirkland, WA", "4.8", undefined, "Not Called"],
      ["Shane", "Lynch", "Northwest Power Pros", "Owner", "+1 (206) 555-0193", "Solar", "Shoreline, WA", "4.6", undefined, "Not Called"],
      ["Aoife", "Doyle", "Doyle Renewable Works", "CEO", "+1 (971) 555-0201", "Solar", "Eugene, OR", "4.7", "Interested in the full digital package.", "Callback"],
    ],
  ],
  [
    "Austin Web Design",
    [0, 4],
    [
      ["Skyler", "Brooks", "Austin Crafted Homes", "Owner", "+1 (512) 555-0301", "Home Building", "Austin, TX", "4.7", undefined, "Not Called"],
      ["Morgan", "Perry", "Barton Springs Legal", "Managing Partner", "+1 (512) 555-0314", "Legal", "Austin, TX", "4.8", "Very old website. Easy sell.", "Interested"],
      ["Jamie", "Reed", "Zilker Fitness Studio", "Owner", "+1 (512) 555-0322", "Fitness", "Austin, TX", "4.6", undefined, "Busy"],
      ["Drew", "Cooper", "South Congress Architecture", "Principal", "+1 (512) 555-0338", "Architecture", "Austin, TX", "4.9", "Runs a boutique firm. Wants a portfolio site.", "Callback"],
      ["Casey", "Howard", "Rainey Hospitality", "GM", "+1 (512) 555-0345", "Hospitality", "Austin, TX", "4.5", undefined, "Not Called"],
      ["Riley", "Simmons", "Simmons Auto Detailing", "Owner", "+1 (512) 555-0357", "Auto Detailing", "Round Rock, TX", "4.6", undefined, "Not Called"],
      ["Avery", "Peterson", "Peterson Wellness Clinic", "Owner", "+1 (512) 555-0364", "Wellness", "Cedar Park, TX", "4.8", "Interested in booking funnel too.", "Interested"],
      ["Quinn", "Evans", "Evans Wedding Co.", "Founder", "+1 (512) 555-0371", "Events", "Austin, TX", "5.0", "High-end wedding planner. Wants luxury website.", "Interested"],
      ["Hayden", "Collins", "Collins Custom Furniture", "Owner", "+1 (512) 555-0388", "Furniture", "Buda, TX", "4.7", undefined, "Not Called"],
      ["Finley", "Richardson", "Richardson Real Estate", "Broker", "+1 (512) 555-0395", "Real Estate", "Austin, TX", "4.4", undefined, "Skip"],
      ["Rowan", "Watson", "Watson Music Academy", "Director", "+1 (512) 555-0402", "Education", "Austin, TX", "4.9", "Needs online booking for lessons.", "Callback"],
    ],
  ],
  [
    "New York Med Spas",
    [5, 2, 3],
    [
      ["Dr. Victoria", "Russo", "Russo MedSpa", "Owner", "+1 (212) 555-0101", "Medical Aesthetics", "Manhattan, NY", "5.0", "Top-rated on Yelp. Very polished operation.", "Interested"],
      ["Christine", "Huang", "Luxe Skin NYC", "Director", "+1 (646) 555-0112", "Medical Aesthetics", "Brooklyn, NY", "4.8", undefined, "Not Called"],
      ["Dr. Alana", "Moore", "Moore Wellness & Aesthetics", "Owner", "+1 (212) 555-0124", "Medical Spa", "SoHo, NY", "4.9", "Interested in AI receptionist for after hours.", "Callback"],
      ["Jessica", "Park", "Park Avenue Aesthetics", "Practice Manager", "+1 (212) 555-0137", "Medical Aesthetics", "Upper East Side, NY", "4.7", undefined, "Busy"],
      ["Caitlin", "O'Brien", "O'Brien Skin Studio", "Owner", "+1 (347) 555-0143", "Skin Care", "Astoria, NY", "4.6", undefined, "Not Called"],
      ["Dr. Maya", "Patel", "Patel Rejuvenation Clinic", "Clinical Director", "+1 (917) 555-0151", "Medical Spa", "Midtown, NY", "4.8", "Running a 3-location operation.", "Interested"],
      ["Sandra", "Williams", "Williams Beauty Med", "Owner", "+1 (212) 555-0163", "Medical Aesthetics", "Harlem, NY", "4.5", undefined, "Not Called"],
      ["Dr. Rei", "Tanaka", "Tanaka Anti-Aging Center", "Owner", "+1 (212) 555-0178", "Anti-Aging", "Tribeca, NY", "4.9", "Has an outdated site but great reviews.", "Interested"],
      ["Lauren", "Adams", "Adams Laser Clinic", "GM", "+1 (646) 555-0184", "Laser Aesthetics", "Long Island City, NY", "4.7", undefined, "Not Called"],
      ["Dr. Sophie", "Grant", "Grant Aesthetic Medicine", "Owner", "+1 (212) 555-0192", "Medical Aesthetics", "Flatiron, NY", "4.8", "Referred by Dr. Russo.", "Interested"],
    ],
  ],
  [
    "Chicago Restaurants",
    [7, 3],
    [
      ["Marco", "Vitale", "Vitale's Ristorante", "Owner", "+1 (312) 555-0101", "Restaurant", "River North, IL", "4.8", "Family-run for 20 years. Wants more bookings.", "Interested"],
      ["Aisha", "Robinson", "Robinson's BBQ", "GM", "+1 (773) 555-0113", "Restaurant", "Hyde Park, IL", "4.7", undefined, "Not Called"],
      ["Patrick", "O'Sullivan", "O'Sullivan's Pub & Grill", "Owner", "+1 (312) 555-0121", "Restaurant", "Lincoln Park, IL", "4.5", "Busy season coming up. Good timing.", "Callback"],
      ["Yuki", "Nakamura", "Nakamura Ramen House", "Owner", "+1 (872) 555-0134", "Restaurant", "Wicker Park, IL", "4.9", "Fastest growing ramen spot in the city.", "Interested"],
      ["Gabrielle", "Laurent", "Laurent Bistro", "Owner", "+1 (312) 555-0142", "Restaurant", "Gold Coast, IL", "4.8", undefined, "Not Called"],
      ["Jose", "Morales", "Morales Taqueria", "Founder", "+1 (773) 555-0158", "Restaurant", "Pilsen, IL", "4.6", "3 locations. Needs unified digital presence.", "Interested"],
      ["Emma", "Schultz", "Schultz Brewery & Kitchen", "Director", "+1 (312) 555-0165", "Brewery/Restaurant", "West Loop, IL", "4.7", undefined, "Busy"],
      ["Darius", "Thomas", "Thomas Soul Food Kitchen", "Owner", "+1 (773) 555-0172", "Restaurant", "Bronzeville, IL", "4.9", "Went viral on TikTok. Needs website urgently.", "Interested"],
      ["Lena", "Fischer", "Fischer's Bakehouse", "Owner", "+1 (312) 555-0181", "Bakery/Cafe", "Andersonville, IL", "5.0", undefined, "Not Called"],
      ["Carlos", "Rivera", "Rivera Fusion Kitchen", "GM", "+1 (872) 555-0189", "Restaurant", "Logan Square, IL", "4.6", undefined, "Skip"],
      ["Helena", "Kowalski", "Kowalski's Polish Deli", "Owner", "+1 (773) 555-0197", "Restaurant", "Avondale, IL", "4.8", "Old school charm. Wants modern online presence.", "Callback"],
    ],
  ],
  [
    "UK Estate Agents",
    [0, 7, 3],
    [
      ["Oliver", "Hartley", "Hartley & Co. Estate Agents", "Managing Director", "+44 20 7555 0101", "Real Estate", "London, UK", "4.7", "Large independent agency. 4 branches.", "Interested"],
      ["Emily", "Chamberlain", "Chamberlain Residential", "Owner", "+44 161 555 0112", "Real Estate", "Manchester, UK", "4.8", undefined, "Not Called"],
      ["Edward", "Forsythe", "Forsythe Lettings", "Director", "+44 113 555 0119", "Lettings", "Leeds, UK", "4.5", "Expanding into commercial letting.", "Callback"],
      ["Charlotte", "Ashworth", "Ashworth Property Group", "MD", "+44 121 555 0127", "Real Estate", "Birmingham, UK", "4.9", "High-growth agency. Looking for digital edge.", "Interested"],
      ["William", "Blackwood", "Blackwood Homes", "Founder", "+44 131 555 0134", "Real Estate", "Edinburgh, UK", "4.6", undefined, "Not Called"],
      ["Sophia", "Whitmore", "Whitmore & Webb", "Partner", "+44 117 555 0141", "Real Estate", "Bristol, UK", "4.7", undefined, "Busy"],
      ["Henry", "Lancaster", "Lancaster Property Co.", "Owner", "+44 1223 555 0149", "Real Estate", "Cambridge, UK", "4.8", "Premium residential agency. High AOV.", "Interested"],
      ["Freya", "Saunders", "Saunders Prestige Homes", "Director", "+44 1865 555 0157", "Real Estate", "Oxford, UK", "4.9", "Referred by a client in London.", "Interested"],
      ["Hugo", "Pemberton", "Pemberton Rural & Country", "MD", "+44 1604 555 0165", "Rural Property", "Northampton, UK", "4.5", undefined, "Not Called"],
      ["Alice", "Beaumont", "Beaumont City Lettings", "Owner", "+44 151 555 0173", "Lettings", "Liverpool, UK", "4.6", undefined, "Skip"],
      ["George", "Fletcher", "Fletcher New Homes", "Director", "+44 114 555 0181", "New Homes", "Sheffield, UK", "4.7", undefined, "Not Called"],
      ["Imogen", "Radcliffe", "Radcliffe Coastal Homes", "Owner", "+44 1202 555 0189", "Coastal Property", "Bournemouth, UK", "4.8", "Niche coastal property market. Very interested.", "Callback"],
    ],
  ],
  [
    "Phoenix Med Clinics",
    [5, 2, 8],
    [
      ["Dr. Robert", "Jensen", "Jensen Family Clinic", "Practice Owner", "+1 (602) 555-0101", "General Practice", "Phoenix, AZ", "4.8", undefined, "Not Called"],
      ["Dr. Priya", "Krishnan", "Krishnan Urgent Care", "Medical Director", "+1 (480) 555-0114", "Urgent Care", "Scottsdale, AZ", "4.7", "Running 3 clinics. Needs scalable phone system.", "Interested"],
      ["Nurse", "Rachel Horton", "Horton Home Health", "Owner", "+1 (623) 555-0122", "Home Health", "Glendale, AZ", "4.6", undefined, "Callback"],
      ["Dr. Miguel", "Sandoval", "Sandoval Chiropractic", "Owner", "+1 (602) 555-0131", "Chiropractic", "Tempe, AZ", "4.9", "Just opened 2nd location. Needs booking funnel.", "Interested"],
      ["Dr. Angela", "Wu", "Wu Acupuncture Center", "Owner", "+1 (480) 555-0139", "Acupuncture", "Chandler, AZ", "4.8", undefined, "Not Called"],
      ["Dr. Samuel", "Okonkwo", "Okonkwo Rehabilitation", "Director", "+1 (602) 555-0147", "Physical Therapy", "Mesa, AZ", "4.5", undefined, "Busy"],
      ["Dr. Laura", "Gomez", "Gomez Dermatology", "Owner", "+1 (480) 555-0154", "Dermatology", "Scottsdale, AZ", "5.0", "Award-winning practice. Premium opportunity.", "Interested"],
      ["Dr. James", "Osei", "Osei Pediatric Center", "Medical Director", "+1 (602) 555-0162", "Pediatrics", "Avondale, AZ", "4.7", "Wants to reduce no-shows specifically.", "Callback"],
      ["Dr. Nina", "Sharaf", "Sharaf Wellness", "Owner", "+1 (480) 555-0171", "Integrative Medicine", "Gilbert, AZ", "4.9", "High-end clientele. Values professionalism.", "Interested"],
      ["Mark", "Heller", "Heller Sports Medicine", "Practice Manager", "+1 (602) 555-0179", "Sports Medicine", "Peoria, AZ", "4.6", undefined, "Not Called"],
    ],
  ],
  [
    "Toronto Financial Advisors",
    [6, 0, 9],
    [
      ["David", "Mackenzie", "Mackenzie Wealth Management", "Senior Advisor", "+1 (416) 555-0101", "Financial Advisory", "Toronto, ON", "4.9", "Managing $50M+ AUM. Needs high-quality digital.", "Interested"],
      ["Jennifer", "Chow", "Chow Financial Planning", "Owner", "+1 (647) 555-0112", "Financial Planning", "Mississauga, ON", "4.7", undefined, "Not Called"],
      ["Michael", "O'Brien", "O'Brien Retirement Group", "Founder", "+1 (905) 555-0119", "Retirement Planning", "Oakville, ON", "4.8", "Transitioning from wirehouse. Good timing.", "Callback"],
      ["Sarah", "Goldstein", "Goldstein Investment Group", "MD", "+1 (416) 555-0127", "Investment Management", "North York, ON", "4.6", undefined, "Busy"],
      ["Ahmed", "Hassan", "Hassan Tax & Financial", "Owner", "+1 (416) 555-0134", "Tax & Financial", "Scarborough, ON", "4.5", undefined, "Not Called"],
      ["Rachel", "Bernstein", "Bernstein & Associates", "Principal", "+1 (647) 555-0142", "Financial Advisory", "Toronto, ON", "4.9", "Growing rapidly. Needs proper CRM and pipeline.", "Interested"],
      ["Kevin", "Lam", "Lam Mortgage & Finance", "Owner", "+1 (905) 555-0151", "Mortgage Brokerage", "Markham, ON", "4.7", undefined, "Not Called"],
      ["Stacy", "Williams", "Williams Financial Services", "Advisor", "+1 (416) 555-0158", "Financial Services", "Etobicoke, ON", "4.6", "Interested in the training portal.", "Callback"],
      ["Pierre", "Beaumont", "Beaumont Private Wealth", "Director", "+1 (416) 555-0165", "Private Wealth", "Yorkville, ON", "5.0", "Ultra-high-net-worth clientele.", "Interested"],
      ["Ling", "Zhang", "Zhang Financial Group", "President", "+1 (905) 555-0174", "Financial Advisory", "Richmond Hill, ON", "4.8", undefined, "Not Called"],
    ],
  ],
  [
    "Atlanta Property Management",
    [6, 3, 0],
    [
      ["Terrence", "Jackson", "Jackson Property Group", "CEO", "+1 (404) 555-0101", "Property Management", "Atlanta, GA", "4.7", "Managing 400+ units. Scaling fast.", "Interested"],
      ["Monique", "Williams", "Williams Realty & Management", "Owner", "+1 (678) 555-0113", "Property Management", "Sandy Springs, GA", "4.8", undefined, "Not Called"],
      ["Brandon", "Davis", "Davis Commercial PM", "Director", "+1 (770) 555-0122", "Commercial PM", "Marietta, GA", "4.5", "Looking for CRM to handle maintenance requests.", "Callback"],
      ["Keisha", "Brown", "Brown Residential Rentals", "Founder", "+1 (404) 555-0135", "Residential PM", "Decatur, GA", "4.9", "Has a waiting list of landlords wanting her services.", "Interested"],
      ["Tyler", "Harris", "Harris HOA Management", "Owner", "+1 (678) 555-0141", "HOA Management", "Duluth, GA", "4.6", undefined, "Not Called"],
      ["Denise", "Wilson", "Wilson Short-Term Rentals", "GM", "+1 (770) 555-0153", "Short-Term Rental PM", "Alpharetta, GA", "4.7", "Airbnb portfolio. Wants better review system.", "Interested"],
      ["Marcus", "Johnson", "Johnson Property Services", "Owner", "+1 (404) 555-0162", "Property Services", "East Point, GA", "4.4", undefined, "Busy"],
      ["Alicia", "Thompson", "Thompson Estate Management", "Director", "+1 (678) 555-0171", "Estate Management", "Buckhead, GA", "4.8", "High-end single-family portfolio.", "Interested"],
      ["Deshawn", "Moore", "Moore Multifamily", "CEO", "+1 (404) 555-0179", "Multifamily PM", "College Park, GA", "4.6", "In acquisition mode. Good time to get in.", "Callback"],
      ["Simone", "Taylor", "Taylor Community Management", "Owner", "+1 (770) 555-0187", "Community Management", "Peachtree City, GA", "4.9", undefined, "Not Called"],
      ["Andre", "Robinson", "Robinson Commercial Group", "Principal", "+1 (404) 555-0196", "Commercial PM", "Midtown, GA", "4.5", undefined, "Not Called"],
    ],
  ],
];

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
      ["Maya", "Ortiz", "Maya's Plumbing Co.", "Owner", "+1 (512) 555-0142", "Plumbing", "Austin, TX", "4.8", "https://www.google.com/maps/search/?api=1&query=Maya%27s+Plumbing+Austin"],
      ["Noah", "Bennett", "Bennett Electric", "Operations manager", "+1 (512) 555-0188", "Electrical", "Austin, TX", "4.6", "https://www.google.com/maps/search/?api=1&query=Bennett+Electric+Austin"],
      ["Priya", "Shah", "Hill Country Roofing", "Co-owner", "+1 (512) 555-0194", "Roofing", "Round Rock, TX", "4.7", "https://www.google.com/maps/search/?api=1&query=Hill+Country+Roofing+Austin"],
      ["Jordan", "Lee", "Greenline Landscaping", "Founder", "+1 (512) 555-0163", "Landscaping", "Austin, TX", "4.5", "https://www.google.com/maps/search/?api=1&query=Greenline+Landscaping+Austin"],
      ["Elena", "Park", "Cedar & Stone HVAC", "General manager", "+1 (512) 555-0116", "HVAC", "Austin, TX", "4.9", "https://www.google.com/maps/search/?api=1&query=Cedar+and+Stone+HVAC+Austin"],
      ["Marcus", "Hill", "Lone Star Glass", "Owner", "+1 (512) 555-0177", "Glazing", "Austin, TX", "4.4", "https://www.google.com/maps/search/?api=1&query=Lone+Star+Glass+Austin"],
    ] as const;
    for (const [firstName, lastName, company, title, phone, industry, location, rating, googleMapsUrl] of leads) {
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

    const campaignStatuses = [
      "active", "active", "active", "active", "active",
      "active", "active", "active", "active", "active",
      "active", "active", "archived", "draft",
    ] as const;

    for (let campaignIndex = 0; campaignIndex < companionCampaigns.length; campaignIndex += 1) {
      const [name, indices, leads] = companionCampaigns[campaignIndex];
      const offerId = await ctx.db.insert("offers", {
        organizationId,
        name: `${name} qualification`,
        description: "Qualification and booking guidance for this campaign.",
        tags: (indices as number[]).map((index) => companionProducts[index].name),
        idealCustomer: "A decision maker with an active need and a relevant business.",
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
        productIds: (indices as number[]).map((index) => productIds[index]),
        bookingProvider: "calcom",
        bookingUrl: "https://cal.com",
        status: campaignStatuses[campaignIndex] ?? "active",
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
      for (let i = 0; i < leads.length; i += 1) {
        const [firstName, lastName, company, title, phone, industry, location, rating, notes, callStatus] = leads[i];
        await ctx.db.insert("leads", {
          organizationId,
          leadListId,
          company,
          firstName,
          lastName,
          title,
          phone,
          industry,
          location,
          rating,
          notes: notes ?? undefined,
          callStatus: callStatus ?? "Not Called",
          website: `https://www.google.com/search?q=${encodeURIComponent(company)}`,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${company} ${location}`)}`,
          followUpAt: callStatus === "Callback" ? now + 86400000 * (1 + (i % 3)) : undefined,
          customFields: { source: "Call Companion workspace", campaign: name },
          status: callStatus === "Skip" ? "do_not_call" : callStatus === "Interested" && i % 3 === 0 ? "completed" : "queued",
          importedAt: now - i * 3600000,
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
      ["Olivia Martin", "olivia@agencycoalition.com", "Campaign Manager", "owner"],
      ["Marcus Rivera", "marcus@agencycoalition.com", "Sales Lead", "member"],
      ["Sofia Patel", "sofia@agencycoalition.com", "Account Executive", "member"],
      ["James Okafor", "james@agencycoalition.com", "SDR", "member"],
      ["Priya Sharma", "priya@agencycoalition.com", "Client Success", "member"],
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
      ["Hannah Lee", "hannah@example.com"],
      ["Isaac Nguyen", "isaac@example.com"],
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
      "AI Voice Receptionist was added to the product catalog.",
      "CRM & Pipeline Automation product configured.",
      "General Outreach campaign activated with 12 leads.",
      "Texas Roofers campaign launched in Dallas market.",
      "Australian Electricians campaign is live.",
      "New York Med Spas campaign added — 10 prospects queued.",
      "Marcus Rivera joined the organization as Sales Lead.",
      "Sofia Patel accepted invitation as Account Executive.",
      "James Okafor added as SDR.",
      "Toronto Financial Advisors campaign created.",
      "Atlanta Property Management campaign added.",
      "Priya Sharma joined as Client Success Manager.",
      "Pacific Northwest Solar campaign is active — 12 prospects.",
      "Chicago Restaurants campaign added — 11 leads queued.",
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
