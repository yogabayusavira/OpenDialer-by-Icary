import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useMutation, useQuery } from "convex/react";
import {
  Activity as ActivityIcon,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CircleHelp,
  Clock3,
  Edit2,
  ExternalLink,
  FileText,
  Home,
  KeyRound,
  LayoutList,
  ListPlus,
  Mail,
  MailPlus,
  MicOff,
  MoreHorizontal,
  Package,
  Phone,
  Plus,
  Search,
  Settings,
  Trash2,
  UserRound,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import "./styles.css";
import { AuthGate } from "./AuthGate";
import {
  SipClient,
  type SipConnectionStatus,
  type SipProfile,
} from "./lib/sip";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

const Icon = ({ children }: { children: ReactNode }) => (
  <span className="nav-icon">{children}</span>
);

const emptySipProfile: SipProfile = {
  webSocketServer: "",
  domain: "",
  username: "",
  password: "",
};
const callingLines = [
  { id: "sip-primary", number: "+1 (415) 890-2144", provider: "SIP" },
];

type ImportedLead = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  title?: string;
  industry?: string;
  location?: string;
  website?: string;
  googleMapsUrl?: string;
  rating?: string;
};
type CsvPreview = { fileName: string; headers: string[]; rows: string[][] };
type CsvMapping = Record<keyof ImportedLead, string>;
const parseCsv = (source: string) => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

function App({ initialSipProfile }: { initialSipProfile?: SipProfile }) {
  const account = useQuery(api.organizations.onboardingState);
  const leadLists = useQuery(api.leadLists.list) || [];
  const campaignWorkspace = useQuery(api.campaigns.workspace);
  const dialerWorkspace = useQuery(api.dialer.workspace);
  const myCampaigns = useQuery(api.dialer.myCampaigns) || [];
  const homeData = useQuery(api.dialer.home);
  const products = useQuery(api.products.list) || [];
  const organizationOverview = useQuery(api.organizationData.overview);
  const organizationMembers = useQuery(api.organizationData.members) || [];
  const organizationActivity = useQuery(api.organizationData.activity) || [];
  const acquaintances = useQuery(api.organizationData.acquaintances) || [];
  const allLeads = useQuery(api.leadLists.listAllLeads) || [];
  const updateProfile = useMutation(api.organizations.updateProfile);
  const importLeadCsv = useMutation(api.leadLists.importCsv);
  const createOffer = useMutation(api.campaigns.createOffer);
  const createPlaybook = useMutation(api.campaigns.createPlaybook);
  const createCampaign = useMutation(api.campaigns.createCampaign);
  const setActiveCampaign = useMutation(api.dialer.setActiveCampaign);
  const seedDemoData = useMutation(api.demo.seedCallCompanion);
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const removeProduct = useMutation(api.products.remove);
  const inviteMember = useMutation(api.organizationData.inviteMember);
  const removeMember = useMutation(api.organizationData.removeMember);
  const addAcquaintance = useMutation(api.organizationData.addAcquaintance);
  const updateAcquaintance = useMutation(
    api.organizationData.updateAcquaintance,
  );
  const removeAcquaintance = useMutation(
    api.organizationData.removeAcquaintance,
  );
  const recordCallOutcome = useMutation(api.dialer.recordOutcome);
  const saveCampaignOffer = useMutation(api.campaigns.saveCampaignOffer);
  const saveCampaignPlaybook = useMutation(api.campaigns.saveCampaignPlaybook);
  const renameCampaign = useMutation(api.campaigns.renameCampaign);
  const deleteCampaign = useMutation(api.campaigns.deleteCampaign);
  const deleteCampaignOffer = useMutation(api.campaigns.deleteCampaignOffer);
  const deleteCampaignPlaybook = useMutation(
    api.campaigns.deleteCampaignPlaybook,
  );
  const linkProductToCampaign = useMutation(api.campaigns.linkProductToCampaign);
  const toggleProductInCampaign = useMutation(api.campaigns.toggleProductInCampaign);
  const addToMyCampaigns = useMutation(api.dialer.addToMyCampaigns);
  const removeFromMyCampaigns = useMutation(api.dialer.removeFromMyCampaigns);
  const renameLeadList = useMutation(api.leadLists.rename);
  const removeLeadList = useMutation(api.leadLists.remove);
  const [notes, setNotes] = useState("");
  const [callState, setCallState] = useState<
    "ready" | "dialing" | "calling" | "complete"
  >("ready");
  const [activeTab, setActiveTab] = useState("Conversation");
  const [saved, setSaved] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [assistantPrompt, setAssistantPrompt] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingCalendarOpen, setBookingCalendarOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [dialPadOpen, setDialPadOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [addedToList, setAddedToList] = useState(false);
  const [selectedLead, setSelectedLead] = useState(0);
  const [activeNav, setActiveNav] = useState("Dial");
  const [organizationOpen, setOrganizationOpen] = useState(false);
  const [linePickerOpen, setLinePickerOpen] = useState(false);
  const [selectedLineId, setSelectedLineId] = useState(callingLines[0].id);
  const [paused, setPaused] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(true);
  const [bookingChecks, setBookingChecks] = useState([false, false, false]);
  const [draftCreated, setDraftCreated] = useState(false);
  const [dialedDigits, setDialedDigits] = useState("");
  const [meetingBooked, setMeetingBooked] = useState(false);
  const [autoDialAfterOutcome, setAutoDialAfterOutcome] =
    useState<Id<"leads"> | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [sipProfile, setSipProfile] = useState<SipProfile>(
    initialSipProfile || emptySipProfile,
  );
  const [sipStatus, setSipStatus] =
    useState<SipConnectionStatus>("disconnected");
  const [settingsTab, setSettingsTab] = useState<
    "Profile" | "Numbers" | "Integrations"
  >("Numbers");
  const [sipBusy, setSipBusy] = useState(false);
  const [sipError, setSipError] = useState("");
  const [profileDraft, setProfileDraft] = useState({
    displayName: "",
    title: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportMessage, setCsvImportMessage] = useState("");
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [csvCampaignId, setCsvCampaignId] = useState<Id<"campaigns"> | null>(
    null,
  );
  const [csvMapping, setCsvMapping] = useState<CsvMapping>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    title: "",
    industry: "",
    location: "",
    website: "",
    googleMapsUrl: "",
    rating: "",
  });
  const [offerDraft, setOfferDraft] = useState({ name: "", description: "" });
  const [playbookDraft, setPlaybookDraft] = useState({ name: "", body: "" });
  const [campaignDraft, setCampaignDraft] = useState({
    name: "",
    offerId: "",
    playbookId: "",
    leadListIds: [] as string[],
  });
  const [campaignPage, setCampaignPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [newCampaignSetup, setNewCampaignSetup] = useState({
    name: "",
    productId: "",
    playbookName: "",
    playbookBody: "",
  });
  const [resourceError, setResourceError] = useState("");
  const [demoSeeding, setDemoSeeding] = useState(false);
  const [productDraft, setProductDraft] = useState({
    name: "",
    description: "",
    tags: "",
    playbook: "",
    whoWeAre: "",
    whoWeHelp: "",
    elevatorPitch: "",
    commonObjections: "",
    faq: "",
    trainingNotes: "",
    bookingProvider: "calcom",
    bookingUrl: "https://cal.com",
    qualificationCriteria: [] as { label: string; guidance?: string; required: boolean }[],
  });
  const [selectedProductId, setSelectedProductId] =
    useState<Id<"products"> | null>(null);
  const [editingProductId, setEditingProductId] =
    useState<Id<"products"> | null>(null);
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [memberDraft, setMemberDraft] = useState({
    name: "",
    email: "",
    title: "",
  });
  const [acquaintanceDraft, setAcquaintanceDraft] = useState({
    name: "",
    email: "",
  });
  const [selectedCampaignId, setSelectedCampaignId] =
    useState<Id<"campaigns"> | null>(null);
  const [selectedCampaignLeadListId, setSelectedCampaignLeadListId] =
    useState<Id<"leadLists"> | null>(null);
  const [pendingQueueLeadId, setPendingQueueLeadId] =
    useState<Id<"leads"> | null>(null);
  const [campaignSection, setCampaignSection] = useState<
    "Overview" | "Product" | "Leads" | "Playbook"
  >("Overview");

  // Global browser-style Topbar navigation history stack
  type NavHistoryItem = {
    activeNav: typeof activeNav;
    selectedCampaignId: Id<"campaigns"> | null;
    selectedProductId: Id<"products"> | null;
    productEditorOpen: boolean;
    editingProductId: Id<"products"> | null;
    campaignSection: "Overview" | "Product" | "Leads" | "Playbook";
  };

  const [navHistory, setNavHistory] = useState<NavHistoryItem[]>([
    {
      activeNav: "Dial",
      selectedCampaignId: null,
      selectedProductId: null,
      productEditorOpen: false,
      editingProductId: null,
      campaignSection: "Overview",
    },
  ]);
  const [navHistoryIndex, setNavHistoryIndex] = useState(0);
  const isNavigatingHistory = useRef(false);

  useEffect(() => {
    if (isNavigatingHistory.current) {
      isNavigatingHistory.current = false;
      return;
    }
    const current: NavHistoryItem = {
      activeNav,
      selectedCampaignId,
      selectedProductId,
      productEditorOpen,
      editingProductId,
      campaignSection,
    };
    setNavHistory((prev) => {
      const activeItem = prev[navHistoryIndex];
      if (
        activeItem &&
        activeItem.activeNav === current.activeNav &&
        activeItem.selectedCampaignId === current.selectedCampaignId &&
        activeItem.selectedProductId === current.selectedProductId &&
        activeItem.productEditorOpen === current.productEditorOpen &&
        activeItem.editingProductId === current.editingProductId &&
        activeItem.campaignSection === current.campaignSection
      ) {
        return prev;
      }
      const trimmed = prev.slice(0, navHistoryIndex + 1);
      return [...trimmed, current];
    });
    setNavHistoryIndex((prev) => prev + 1);
  }, [
    activeNav,
    selectedCampaignId,
    selectedProductId,
    productEditorOpen,
    editingProductId,
    campaignSection,
  ]);

  const handleGoBack = () => {
    if (navHistoryIndex > 0) {
      const target = navHistory[navHistoryIndex - 1];
      isNavigatingHistory.current = true;
      setNavHistoryIndex(navHistoryIndex - 1);
      setActiveNav(target.activeNav);
      setSelectedCampaignId(target.selectedCampaignId);
      setSelectedProductId(target.selectedProductId);
      setProductEditorOpen(target.productEditorOpen);
      setEditingProductId(target.editingProductId);
      setCampaignSection(target.campaignSection);
    }
  };

  const handleGoForward = () => {
    if (navHistoryIndex < navHistory.length - 1) {
      const target = navHistory[navHistoryIndex + 1];
      isNavigatingHistory.current = true;
      setNavHistoryIndex(navHistoryIndex + 1);
      setActiveNav(target.activeNav);
      setSelectedCampaignId(target.selectedCampaignId);
      setSelectedProductId(target.selectedProductId);
      setProductEditorOpen(target.productEditorOpen);
      setEditingProductId(target.editingProductId);
      setCampaignSection(target.campaignSection);
    }
  };
  const campaignDetail = useQuery(
    api.campaigns.campaignDetail,
    selectedCampaignId ? { campaignId: selectedCampaignId } : "skip",
  );
  const [campaignPlaybookDraft, setCampaignPlaybookDraft] = useState({
    name: "",
    body: "",
  });
  const [campaignNameDraft, setCampaignNameDraft] = useState("");
  const [editingCampaignName, setEditingCampaignName] = useState(false);
  const [editingLeadListId, setEditingLeadListId] =
    useState<Id<"leadLists"> | null>(null);
  const [leadListNameDraft, setLeadListNameDraft] = useState("");
  const [callError, setCallError] = useState("");
  const sipClient = useRef(new SipClient()).current;
  const remoteAudio = useRef<HTMLAudioElement>(null);
  const initialSipAttempted = useRef(false);
  const remaining = notes.length;
  const openResearchLink = async (url: string) => {
    try {
      const destination = new URL(url).toString();
      if ("__TAURI_INTERNALS__" in window) {
        const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        new WebviewWindow(`research-${Date.now()}`, {
          url: destination,
          title: "OpenDialer research",
          width: 1180,
          height: 820,
          minWidth: 860,
          minHeight: 620,
        });
      } else {
        window.open(destination, "_blank", "noopener,noreferrer");
      }
    } catch {
      setCallError("That research link is not a valid URL.");
    }
  };
  const leads = (dialerWorkspace?.leads || []).map((item) => {
    const name =
      [item.firstName, item.lastName].filter(Boolean).join(" ") ||
      item.company ||
      "Unnamed lead";
    return {
      ...item,
      initials:
        name
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "LD",
      name,
      role: item.title || "No title",
      company: item.company || "No company",
      phone: item.phone || "",
    };
  });
  const queueIndex = Math.min(selectedLead, Math.max(0, leads.length - 1));
  const queueLead = leads[queueIndex];
  const lead = queueLead || {
    initials: "--",
    name: "No lead selected",
    company: "Import a lead list",
    role: "No campaign queue yet",
    phone: "",
  };
  const activeSellingEntity =
    dialerWorkspace?.activeProduct || dialerWorkspace?.activeOffer || null;
  const bookingCriteria =
    activeSellingEntity?.qualificationCriteria || [];
  const bookingProvider =
    activeSellingEntity?.bookingProvider || "calcom";
  const bookingUrl =
    activeSellingEntity?.bookingUrl || "";
  const profileName = account?.profile.displayName || "Jamie Morgan";
  const profileTitle = account?.profile.title || "Sales representative";
  const profileImage = account?.profile.image || null;
  const profileInitials =
    profileName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "OD";
  const organizationName = account?.organizationName || "My workspace";
  const selectedLine =
    callingLines.find((line) => line.id === selectedLineId) || callingLines[0];
  const openNumbersSettings = () => {
    setActiveNav("Settings");
    setSettingsTab("Numbers");
  };
  const addDemoData = async () => {
    setDemoSeeding(true);
    setResourceError("");
    try {
      const result = await seedDemoData({});
      openCampaign(result.campaignId);
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not add demo data.",
      );
    } finally {
      setDemoSeeding(false);
    }
  };
  const openProductEditor = (product?: (typeof products)[number]) => {
    if (product) {
      setEditingProductId(product._id);
      setSelectedProductId(product._id);
      setProductDraft({
        name: product.name,
        description: product.description || "",
        tags: (product.tags || []).join(", "),
        playbook: product.playbook || "",
        whoWeAre: product.whoWeAre || "",
        whoWeHelp: product.whoWeHelp || "",
        elevatorPitch: product.elevatorPitch || "",
        commonObjections: product.commonObjections || "",
        faq: product.faq || "",
        trainingNotes: product.trainingNotes || "",
        bookingProvider: product.bookingProvider || "calcom",
        bookingUrl: product.bookingUrl || "",
        qualificationCriteria: product.qualificationCriteria?.length
          ? product.qualificationCriteria.map((c) => ({
              label: c.label,
              guidance: c.guidance || "",
              required: c.required,
            }))
          : [{ label: "", guidance: "", required: true }],
      });
    } else {
      setEditingProductId(null);
      setProductDraft({
        name: "",
        description: "",
        tags: "",
        playbook: "",
        whoWeAre: "",
        whoWeHelp: "",
        elevatorPitch: "",
        commonObjections: "",
        faq: "",
        trainingNotes: "",
        bookingProvider: "calcom",
        bookingUrl: "https://cal.com",
        qualificationCriteria: [{ label: "", guidance: "", required: true }],
      });
    }
    setProductEditorOpen(true);
  };
  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    setResourceError("");
    try {
      const data = {
        name: productDraft.name,
        description: productDraft.description,
        tags: productDraft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        playbook: productDraft.playbook,
        whoWeAre: productDraft.whoWeAre,
        whoWeHelp: productDraft.whoWeHelp,
        elevatorPitch: productDraft.elevatorPitch,
        commonObjections: productDraft.commonObjections,
        faq: productDraft.faq,
        trainingNotes: productDraft.trainingNotes,
        bookingProvider: (productDraft.bookingProvider === "calcom" ||
        productDraft.bookingProvider === "calendly"
          ? productDraft.bookingProvider
          : undefined) as "calcom" | "calendly" | undefined,
        bookingUrl: productDraft.bookingUrl,
        qualificationCriteria: productDraft.qualificationCriteria
          .map((c) => ({
            label: c.label.trim(),
            guidance: c.guidance?.trim() || undefined,
            required: c.required,
          }))
          .filter((c) => Boolean(c.label)),
      };
      if (editingProductId) {
        await updateProduct({ productId: editingProductId, ...data });
        setSelectedProductId(editingProductId);
      } else {
        const newId = await createProduct(data);
        if (newId) setSelectedProductId(newId);
      }
      setProductEditorOpen(false);
    } catch (error) {
      setResourceError(
        error instanceof Error ? error.message : "Could not save product.",
      );
    }
  };

  useEffect(() => {
    if (!account) return;
    setProfileDraft({
      displayName: account.profile.displayName,
      title: account.profile.title,
    });
  }, [account?.profile.displayName, account?.profile.title]);

  const isSipConnected = sipStatus === "registered";
  const startCall = async () => {
    setCallError("");
    if (!queueLead || !dialerWorkspace?.activeCampaign) {
      setCallError("Choose a campaign with queued leads before dialing.");
      setActiveNav("My campaigns");
      return;
    }
    if (!isSipConnected) {
      openNumbersSettings();
      return;
    }
    setCallState("dialing");
    try {
      await sipClient.call(lead.phone);
    } catch (error) {
      setCallState("ready");
      setCallError(
        error instanceof Error
          ? error.message
          : "Icary could not start this call.",
      );
    }
  };
  const endCall = async () => {
    try {
      await sipClient.hangup();
    } catch {
      /* Call might have already ended. */
    }
    setCallState("complete");
  };
  const connectSipProfile = async (profile: SipProfile) => {
    if (!remoteAudio.current) return;
    setSipBusy(true);
    setSipError("");
    try {
      await sipClient.connect(profile, remoteAudio.current, {
        onStatusChange: (status, message) => {
          setSipStatus(status);
          if (status === "error")
            setSipError(
              message || "Icary could not connect to this SIP account.",
            );
        },
        onCallAnswered: () => setCallState("calling"),
        onCallEnded: () =>
          setCallState((current) =>
            current === "complete" ? current : "complete",
          ),
      });
    } catch {
      // The status callback contains the useful recovery message.
    } finally {
      setSipBusy(false);
    }
  };
  const connectSip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await connectSipProfile(sipProfile);
  };
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    try {
      await updateProfile(profileDraft);
    } catch (error) {
      setProfileError(
        error instanceof Error
          ? error.message
          : "Icary could not save your profile.",
      );
    } finally {
      setProfileSaving(false);
    }
  };
  const selectCsv = async (
    file: File | undefined,
    campaignId?: Id<"campaigns">,
  ) => {
    if (!file) return;
    setCsvImportMessage("");
    try {
      const rows = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
      if (rows.length < 2)
        throw new Error(
          "Choose a CSV with a header row and at least one lead.",
        );
      setCsvPreview({
        fileName: file.name,
        headers: rows[0],
        rows: rows.slice(1),
      });
      setCsvCampaignId(campaignId || null);
      if (campaignId) setCampaignSection("Leads");
      setCsvMapping({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        title: "",
        industry: "",
        location: "",
        website: "",
        googleMapsUrl: "",
        rating: "",
      });
    } catch (error) {
      setCsvImportMessage(
        error instanceof Error
          ? error.message
          : "Icary could not read that CSV.",
      );
    }
  };
  const importMappedCsv = async () => {
    if (!csvPreview) return;
    const mappedColumns = Object.values(csvMapping).filter(Boolean);
    if (!mappedColumns.length) {
      setCsvImportMessage("Map at least one column before importing.");
      return;
    }
    setCsvImporting(true);
    setCsvImportMessage("");
    try {
      const column = (row: string[], field: keyof ImportedLead) => {
        const index = csvPreview.headers.indexOf(csvMapping[field]);
        return index >= 0 ? row[index]?.trim() || undefined : undefined;
      };
      const imported = csvPreview.rows
        .map((row) => ({
          firstName: column(row, "firstName"),
          lastName: column(row, "lastName"),
          email: column(row, "email"),
          phone: column(row, "phone"),
          company: column(row, "company"),
          title: column(row, "title"),
          industry: column(row, "industry"),
          location: column(row, "location"),
          website: column(row, "website"),
          googleMapsUrl: column(row, "googleMapsUrl"),
          rating: column(row, "rating"),
        }))
        .filter(
          (lead) =>
            lead.firstName ||
            lead.lastName ||
            lead.email ||
            lead.phone ||
            lead.company,
        );
      if (!csvCampaignId)
        throw new Error(
          "Open a campaign, then import leads from its Leads workspace.",
        );
      await importLeadCsv({
        name: csvPreview.fileName.replace(/\.csv$/i, "") || "Imported leads",
        campaignId: csvCampaignId,
        leads: imported,
      });
      setCsvImportMessage(`${imported.length} leads imported.`);
      setCsvPreview(null);
      setCsvCampaignId(null);
    } catch (error) {
      setCsvImportMessage(
        error instanceof Error
          ? error.message
          : "Icary could not import that CSV.",
      );
    } finally {
      setCsvImporting(false);
    }
  };
  const saveOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResourceError("");
    try {
      await createOffer(offerDraft);
      setOfferDraft({ name: "", description: "" });
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not save this offer.",
      );
    }
  };
  const savePlaybook = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResourceError("");
    try {
      await createPlaybook(playbookDraft);
      setPlaybookDraft({ name: "", body: "" });
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not save this playbook.",
      );
    }
  };
  const saveCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResourceError("");
    try {
      const campaignId = await createCampaign({
        name: newCampaignSetup.name,
        leadListIds: [],
      });
      if (newCampaignSetup.productId)
        await linkProductToCampaign({
          campaignId,
          productId: newCampaignSetup.productId as any,
        });
      if (
        newCampaignSetup.playbookName.trim() &&
        newCampaignSetup.playbookBody.trim()
      )
        await saveCampaignPlaybook({
          campaignId,
          name: newCampaignSetup.playbookName,
          body: newCampaignSetup.playbookBody,
        });
      setNewCampaignSetup({
        name: "",
        productId: "",
        playbookName: "",
        playbookBody: "",
      });
      setCreateCampaignOpen(false);
      setSelectedCampaignId(campaignId);
      setCampaignSection("Overview");
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not save this campaign.",
      );
    }
  };
  useEffect(() => {
    if (
      !initialSipProfile ||
      initialSipAttempted.current ||
      !remoteAudio.current
    )
      return;
    initialSipAttempted.current = true;
    void connectSipProfile(initialSipProfile);
  }, [initialSipProfile]);
  useEffect(() => {
    if (!campaignDetail) return;
    setCampaignPlaybookDraft({
      name: campaignDetail.playbook?.name || "",
      body: campaignDetail.playbook?.body || "",
    });
    setCampaignNameDraft(campaignDetail.campaign.name);
  }, [
    campaignDetail?.campaign._id,
    campaignDetail?.playbook?._id,
  ]);
  useEffect(() => {
    setBookingChecks(bookingCriteria.map(() => false));
    setBookingCalendarOpen(false);
  }, [dialerWorkspace?.activeProduct?._id, dialerWorkspace?.activeOffer?._id, bookingCriteria.length]);
  useEffect(() => {
    if (!pendingQueueLeadId || !dialerWorkspace?.activeCampaign) return;
    const index = dialerWorkspace.leads.findIndex(
      (item) => item._id === pendingQueueLeadId,
    );
    if (index >= 0) {
      setSelectedLead(index);
      setPendingQueueLeadId(null);
    }
  }, [
    dialerWorkspace?.activeCampaign?._id,
    dialerWorkspace?.leads,
    pendingQueueLeadId,
  ]);
  useEffect(() => {
    if (!autoDialAfterOutcome || !dialerWorkspace) return;
    if (!queueLead) {
      setAutoDialAfterOutcome(null);
      return;
    }
    if (
      queueLead._id === autoDialAfterOutcome ||
      !isSipConnected ||
      callState !== "ready"
    )
      return;
    setAutoDialAfterOutcome(null);
    void startCall();
  }, [
    autoDialAfterOutcome,
    queueLead?._id,
    dialerWorkspace,
    isSipConnected,
    callState,
  ]);
  const updateSipProfile = (field: keyof SipProfile, value: string) =>
    setSipProfile((current) => ({ ...current, [field]: value }));
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (next) sipClient.mute();
    else sipClient.unmute();
  };
  const sendDtmf = async (digit: string) => {
    const tone = digit[0];
    setDialedDigits((current) => `${current}${tone}`);
    try {
      await sipClient.sendDtmf(tone);
    } catch {
      setCallError("The SIP server did not accept that dial-pad tone.");
    }
  };
  const finishOutcome = async (callNext: boolean) => {
    if (!queueLead || !dialerWorkspace?.activeCampaign || !outcomeDraft) return;
    const finalOutcome = meetingBooked ? "Meeting booked" : outcomeDraft;
    try {
      await recordCallOutcome({
        campaignId: dialerWorkspace.activeCampaign._id,
        leadId: queueLead._id,
        outcome: finalOutcome,
        notes: notes || undefined,
      });
      setOutcome(finalOutcome);
      setSelectedLead(0);
      setCallState("ready");
      setAutoDialAfterOutcome(callNext ? queueLead._id : null);
      if (callNext)
        setCallError("Saved. Dial the next queued lead when you are ready.");
    } catch (error) {
      setCallError(
        error instanceof Error
          ? error.message
          : "Icary could not save this outcome.",
      );
    }
    setOutcomeDraft("");
    setFollowUp("");
    setMeetingBooked(false);
  };
  const saveWrapUp = () => {
    void finishOutcome(true);
  };
  const saveAndPause = () => {
    void finishOutcome(false);
  };
  const openCampaign = (
    campaignId: Id<"campaigns">,
    section: "Overview" | "Product" | "Leads" | "Playbook" = "Overview",
  ) => {
    setSelectedCampaignId(campaignId);
    setSelectedCampaignLeadListId(null);
    setCampaignSection(section);
    setActiveNav("Campaigns");
  };
  const dialCampaignLead = async (
    leadId: Id<"leads">,
    leadListId: Id<"leadLists">,
  ) => {
    if (!selectedCampaignId) return;
    try {
      await startCampaign(selectedCampaignId, leadListId);
      setPendingQueueLeadId(leadId);
      setActiveNav("Dial");
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not open this lead in the dialer.",
      );
    }
  };
  const startCampaign = async (
    campaignId: Id<"campaigns">,
    leadListId: Id<"leadLists"> | null = selectedCampaignLeadListId,
  ) => {
    const targetLeadListId =
      leadListId ||
      selectedCampaignLeadListId ||
      campaignDetail?.leadLists[0]?._id ||
      campaignDetail?.leads[0]?.leadListId;
    if (!targetLeadListId) {
      setResourceError("Import leads into this campaign before starting Dial.");
      return;
    }
    try {
      await setActiveCampaign({ campaignId, leadListId: targetLeadListId });
      setSelectedLead(0);
      setActiveNav("Dial");
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not start this campaign.",
      );
    }
  };

  const savePlaybookForCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCampaignId) return;
    setResourceError("");
    try {
      await saveCampaignPlaybook({
        campaignId: selectedCampaignId,
        ...campaignPlaybookDraft,
      });
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not save this playbook.",
      );
    }
  };
  const saveCampaignName = async () => {
    if (!selectedCampaignId || !campaignNameDraft.trim()) return;
    try {
      await renameCampaign({
        campaignId: selectedCampaignId,
        name: campaignNameDraft,
      });
      setEditingCampaignName(false);
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not rename this campaign.",
      );
    }
  };
  const removeCampaign = async () => {
    if (
      !selectedCampaignId ||
      !window.confirm(
        "Delete this campaign? Its offer and playbook will be removed, but its lead lists will remain.",
      )
    )
      return;
    try {
      await deleteCampaign({ campaignId: selectedCampaignId });
      setSelectedCampaignId(null);
      setActiveNav("Campaigns");
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not delete this campaign.",
      );
    }
  };

  const removePlaybook = async () => {
    if (!selectedCampaignId || !window.confirm("Delete this playbook?")) return;
    try {
      await deleteCampaignPlaybook({ campaignId: selectedCampaignId });
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not delete this playbook.",
      );
    }
  };
  const saveLeadListName = async () => {
    if (!editingLeadListId || !leadListNameDraft.trim()) return;
    try {
      await renameLeadList({
        leadListId: editingLeadListId,
        name: leadListNameDraft,
      });
      setEditingLeadListId(null);
      setLeadListNameDraft("");
    } catch (error) {
      setCsvImportMessage(
        error instanceof Error
          ? error.message
          : "Icary could not rename this lead list.",
      );
    }
  };
  const deleteLeadList = async (leadListId: Id<"leadLists">, name: string) => {
    if (
      !window.confirm(
        `Delete “${name}” and all of its leads? It will also be detached from every campaign.`,
      )
    )
      return;
    try {
      await removeLeadList({ leadListId });
      if (editingLeadListId === leadListId) setEditingLeadListId(null);
    } catch (error) {
      setCsvImportMessage(
        error instanceof Error
          ? error.message
          : "Icary could not delete this lead list.",
      );
    }
  };
  const addInsightToNotes = () => {
    const insight =
      "Amelia is evaluating ways to reduce context switching ahead of a Q3 evaluation.";
    setNotes((current) =>
      current.includes(insight)
        ? current
        : `${current}${current ? "\n" : ""}${insight}`,
    );
    setSaved(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="shell-brand">
          <div className="brand-mark">i</div>
          <span className="brand-lockup">
            <span className="brand-name">OpenDialer</span>
            <span className="brand-attribution">by icary</span>
          </span>
        </div>
        <div className="topbar-nav-controls">
          <button
            type="button"
            className="topbar-nav-button"
            disabled={navHistoryIndex <= 0}
            onClick={handleGoBack}
            title="Go back"
            aria-label="Go back"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="topbar-nav-button"
            disabled={navHistoryIndex >= navHistory.length - 1}
            onClick={handleGoForward}
            title="Go forward"
            aria-label="Go forward"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <label className="global-search">
          <Search size={16} />
          <input
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            placeholder="Search leads, campaigns, or contacts"
            aria-label="Search leads, campaigns, or contacts"
          />
        </label>
        <div className="topbar-actions">
          <button
            className="icon-button notification"
            aria-label="Notifications"
          >
            <Bell size={19} />
            <i />
          </button>
          <button className="help-button">
            <CircleHelp size={17} /> Help
          </button>
        </div>
      </header>
      <aside className="sidebar" aria-label="Primary navigation">
        <nav>
          <div className="line-selector">
            <button
              className="line-selector-trigger"
              onClick={() => setLinePickerOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={linePickerOpen}
            >
              <Phone size={16} />
              <span>{selectedLine.number}</span>
              <small>{selectedLine.provider}</small>
              <ChevronDown
                size={15}
                className={linePickerOpen ? "rotated" : ""}
              />
            </button>
            {linePickerOpen && (
              <div
                className="line-picker-menu"
                role="menu"
                aria-label="Choose outbound line"
              >
                {callingLines.map((line) => (
                  <button
                    key={line.id}
                    className={line.id === selectedLineId ? "selected" : ""}
                    role="menuitem"
                    onClick={() => {
                      setSelectedLineId(line.id);
                      setLinePickerOpen(false);
                    }}
                  >
                    <span>{line.number}</span>
                    <small>{line.provider}</small>
                  </button>
                ))}
                <div className="line-picker-divider" />
                <button
                  className="add-number-button"
                  role="menuitem"
                  onClick={() => {
                    setLinePickerOpen(false);
                    openNumbersSettings();
                  }}
                >
                  <Plus size={15} />
                  <span>Add a number</span>
                </button>
              </div>
            )}
          </div>
          <div className="nav-section personal-section">
            <div className="nav-label">Personal</div>
            <button
              className={`nav-item ${activeNav === "Home" ? "active" : ""}`}
              onClick={() => setActiveNav("Home")}
            >
              <Icon>
                <Home size={18} />
              </Icon>
              <span>Dashboard</span>
            </button>
            <button
              className={`nav-item ${activeNav === "My campaigns" ? "active" : ""}`}
              onClick={() => setActiveNav("My campaigns")}
            >
              <Icon>
                <BookOpen size={18} />
              </Icon>
              <span>My campaigns</span>
            </button>
            <button
              className="nav-item coming-nav"
              disabled
              title="Coming soon"
            >
              <Icon>
                <Users size={18} />
              </Icon>
              <span>Acquaintances</span>
              <small>soon</small>
            </button>
          </div>

          <div className="sidebar-divider" />
          <div className="nav-section organization-section">
            <div className="organization-switcher">
              <button
                onClick={() => setOrganizationOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={organizationOpen}
              >
                <span>{organizationName}</span>
                <ChevronDown
                  size={15}
                  className={organizationOpen ? "rotated" : ""}
                />
              </button>
              {organizationOpen && (
                <div className="organization-menu" role="menu">
                  <button
                    className="selected"
                    role="menuitem"
                    onClick={() => setOrganizationOpen(false)}
                  >
                    {organizationName}
                  </button>
                  <button disabled role="menuitem">
                    More organizations soon
                  </button>
                </div>
              )}
            </div>
            <button
              className="nav-item coming-nav"
              disabled
              title="Coming soon"
            >
              <Icon>
                <BarChart3 size={18} />
              </Icon>
              <span>Overview</span>
              <small>soon</small>
            </button>
            <button
              className="nav-item coming-nav"
              disabled
              title="Coming soon"
            >
              <Icon>
                <UserRound size={18} />
              </Icon>
              <span>Members</span>
              <small>soon</small>
            </button>
            <button
              className={`nav-item ${activeNav === "Products" ? "active" : ""}`}
              onClick={() => {
                setSelectedCampaignId(null);
                setSelectedProductId(null);
                setProductEditorOpen(false);
                setActiveNav("Products");
              }}
            >
              <Icon>
                <LayoutList size={18} />
              </Icon>
              <span>Products</span>
            </button>
            <button
              className={`nav-item ${activeNav === "Campaigns" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("Campaigns");
              }}
            >
              <Icon>
                <BookOpen size={18} />
              </Icon>
              <span>Campaigns</span>
            </button>
            <button
              className="nav-item coming-nav"
              disabled
              title="Coming soon"
            >
              <Icon>
                <Clock3 size={18} />
              </Icon>
              <span>Activity</span>
              <small>soon</small>
            </button>
          </div>
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${activeNav === "Settings" ? "active" : ""}`}
            onClick={openNumbersSettings}
          >
            <Icon>
              <Settings size={18} />
            </Icon>
            <span>Global settings</span>
          </button>
          <button className="profile-row">
            <span className="avatar avatar-small">
              {profileImage ? (
                <img src={profileImage} alt="" />
              ) : (
                profileInitials
              )}
            </span>
            <span>
              <strong>{profileName}</strong>
              <small>{profileTitle}</small>
            </span>
            <MoreHorizontal size={17} />
          </button>
        </div>
      </aside>

      <main
        className={`main-area ${activeNav === "Settings" ? "settings-main" : ""}`}
      >
        {activeNav === "Settings" ? (
          <section className="settings-page">
            <header className="settings-page-header">
              <h1>Settings</h1>
              <p>Manage your profile, calling lines, and connected tools.</p>
            </header>
            <div className="settings-layout">
              <nav className="settings-tabs" aria-label="Settings sections">
                {(["Profile", "Numbers", "Integrations"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      className={settingsTab === tab ? "selected" : ""}
                      onClick={() => setSettingsTab(tab)}
                    >
                      {tab}
                    </button>
                  ),
                )}
              </nav>
              <section className="settings-content">
                {settingsTab === "Profile" && (
                  <>
                    <h2>Profile</h2>
                    <p className="settings-description">
                      This information appears to teammates and in shared
                      activity.
                    </p>
                    <form
                      className="profile-settings-form"
                      onSubmit={saveProfile}
                    >
                      <span className="avatar profile-settings-avatar">
                        {profileImage ? (
                          <img src={profileImage} alt="" />
                        ) : (
                          profileInitials
                        )}
                      </span>
                      <div>
                        <label>
                          Name
                          <input
                            required
                            autoComplete="name"
                            value={profileDraft.displayName}
                            onChange={(event) =>
                              setProfileDraft((current) => ({
                                ...current,
                                displayName: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Title
                          <input
                            autoComplete="organization-title"
                            value={profileDraft.title}
                            onChange={(event) =>
                              setProfileDraft((current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                            placeholder="Sales representative"
                          />
                        </label>
                      </div>
                      {profileError && (
                        <p className="settings-error" role="alert">
                          {profileError}
                        </p>
                      )}
                      <div className="settings-form-actions">
                        <button
                          className="primary-button"
                          disabled={profileSaving}
                        >
                          {profileSaving ? "Saving…" : "Save profile"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
                {settingsTab === "Numbers" && (
                  <>
                    <h2>Numbers</h2>
                    <p className="settings-description">
                      Choose the caller ID for your outbound calls and connect
                      new lines here.
                    </p>
                    <div className="settings-line-row">
                      <span className="settings-line-icon">
                        <Phone size={17} />
                      </span>
                      <div>
                        <strong>{selectedLine.number}</strong>
                        <span>
                          {selectedLine.provider} ·{" "}
                          {sipStatus === "registered"
                            ? "Connected"
                            : sipStatus === "connecting"
                              ? "Connecting"
                              : "Not connected"}
                        </span>
                      </div>
                    </div>
                    <form className="sip-settings-form" onSubmit={connectSip}>
                      <div className="settings-form-heading">
                        <h3>Add a SIP line</h3>
                        <p>
                          Use a browser-compatible SIP account with secure
                          WebSocket and WebRTC enabled.
                        </p>
                      </div>
                      <label>
                        Secure WebSocket server
                        <input
                          required
                          inputMode="url"
                          value={sipProfile.webSocketServer}
                          onChange={(event) =>
                            updateSipProfile(
                              "webSocketServer",
                              event.target.value,
                            )
                          }
                          placeholder="wss://pbx.example.com:8089/ws"
                        />
                      </label>
                      <label>
                        SIP domain
                        <input
                          required
                          value={sipProfile.domain}
                          onChange={(event) =>
                            updateSipProfile("domain", event.target.value)
                          }
                          placeholder="pbx.example.com"
                        />
                      </label>
                      <div className="settings-field-row">
                        <label>
                          Extension or username
                          <input
                            required
                            autoComplete="username"
                            value={sipProfile.username}
                            onChange={(event) =>
                              updateSipProfile("username", event.target.value)
                            }
                            placeholder="1001"
                          />
                        </label>
                        <label>
                          Password
                          <input
                            required
                            type="password"
                            autoComplete="current-password"
                            value={sipProfile.password}
                            onChange={(event) =>
                              updateSipProfile("password", event.target.value)
                            }
                            placeholder="••••••••"
                          />
                        </label>
                      </div>
                      {sipError && (
                        <p className="settings-error" role="alert">
                          {sipError}
                        </p>
                      )}
                      <div className="settings-form-actions">
                        <button
                          className="primary-button"
                          disabled={sipBusy || isSipConnected}
                        >
                          {isSipConnected
                            ? "SIP connected"
                            : sipBusy
                              ? "Connecting…"
                              : "Connect SIP"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
                {settingsTab === "Integrations" && (
                  <>
                    <h2>Integrations</h2>
                    <p className="settings-description">
                      Connect the calendar and tools your campaigns use for
                      follow-up.
                    </p>
                    <div className="integration-list">
                      <div>
                        <strong>Cal.com</strong>
                        <span>Meeting booking</span>
                      </div>
                      <div>
                        <strong>Calendly</strong>
                        <span>Meeting booking</span>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          </section>
        ) : activeNav === "Home" ? (
          <section className="home-page">
            <header className="home-header">
              <div>
                <h1>Home</h1>
                <p>Your calling progress across every campaign.</p>
              </div>
              {dialerWorkspace?.activeCampaign ? (
                <button
                  className="primary-button"
                  onClick={() => setActiveNav("Dial")}
                >
                  <Phone size={15} /> Resume dialing
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={() => setActiveNav("My campaigns")}
                >
                  <BookOpen size={15} /> Choose a campaign
                </button>
              )}
            </header>
            <div className="home-stats">
              <div>
                <span>Calls today</span>
                <strong>{homeData?.callsToday || 0}</strong>
              </div>
              <div>
                <span>Conversations</span>
                <strong>{homeData?.completedToday || 0}</strong>
              </div>
              <div>
                <span>Meetings booked</span>
                <strong>{homeData?.meetingsToday || 0}</strong>
              </div>
            </div>
            <div className="home-grid">
              <section className="home-chart">
                <div className="home-section-head">
                  <div>
                    <h2>Last 7 days</h2>
                    <p>Calls and conversations</p>
                  </div>
                  <BarChart3 size={19} />
                </div>
                <div className="bar-chart">
                  {homeData?.daily.map((day) => (
                    <div className="bar-day" key={day.label}>
                      <div className="bar-stack">
                        <i
                          style={{ height: `${Math.max(day.calls, 2) * 12}px` }}
                        />
                        <b
                          style={{
                            height: `${Math.max(day.answers, 1) * 12}px`,
                          }}
                        />
                      </div>
                      <span>{day.label}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="home-queue">
                <div className="home-section-head">
                  <div>
                    <h2>Up next</h2>
                    <p>
                      {dialerWorkspace?.activeCampaign
                        ? `${dialerWorkspace.activeCampaign.leadCount} queued leads`
                        : "No active campaign"}
                    </p>
                  </div>
                </div>
                {dialerWorkspace?.activeCampaign ? (
                  <>
                    <strong>{dialerWorkspace.activeCampaign.name}</strong>
                    <button
                      className="secondary-button"
                      onClick={() => setActiveNav("Dial")}
                    >
                      Open dialer
                    </button>
                  </>
                ) : (
                  <button
                    className="secondary-button"
                    onClick={() => setActiveNav("My campaigns")}
                  >
                    View my campaigns
                  </button>
                )}
              </section>
            </div>
            <section className="recent-calls">
              <div className="home-section-head">
                <div>
                  <h2>Recent outcomes</h2>
                  <p>Your latest saved call activity</p>
                </div>
              </div>
              {homeData?.recent.length ? (
                homeData.recent.map((call) => (
                  <div className="recent-call" key={call._id}>
                    <span className="recent-icon">
                      <CheckCircle2 size={16} />
                    </span>
                    <div>
                      <strong>{call.leadName}</strong>
                      <small>
                        {call.campaignName}
                        {call.notes ? ` · ${call.notes}` : ""}
                      </small>
                    </div>
                    <em>{call.outcome || "Completed"}</em>
                  </div>
                ))
              ) : (
                <p className="empty-copy">Completed calls will appear here.</p>
              )}
            </section>
          </section>
        ) : activeNav === "My campaigns" ? (
          <section className="portfolio-page">
            <header className="home-header">
              <div>
                <h1>My campaigns</h1>
                <p>The campaigns you can work across your organizations.</p>
              </div>
            </header>
            {myCampaigns.length ? (
              <div className="campaign-index">
                {myCampaigns.map((campaign) => {
                  const offer = campaignWorkspace?.offers.find(
                    (item: any) => item._id === campaign.offerId,
                  );
                  const displayProducts =
                    (campaign as any).products && (campaign as any).products.length > 0
                      ? (campaign as any).products
                      : null;
                  const tags = displayProducts
                    ? displayProducts.map((p: any) => p.name)
                    : offer?.tags || (offer?.name ? [offer.name] : []);
                  return (
                    <article className="campaign-card" key={campaign._id}>
                      <button
                        type="button"
                        className="campaign-card-main"
                        onClick={() => openCampaign(campaign._id)}
                      >
                        <div className="campaign-card-header">
                          <div className="campaign-card-title-group">
                            <strong>{campaign.name}</strong>
                            <span className="campaign-card-subtitle">
                              {campaign.status === "active"
                                ? "Ready to dial"
                                : "Draft"}
                            </span>
                          </div>
                        </div>
                        {tags.length > 0 && (
                          <div className="campaign-card-products">
                            {tags.slice(0, 3).map((tag: string) => (
                              <span className="campaign-product-pill" key={tag}>
                                {tag}
                              </span>
                            ))}
                            {tags.length > 3 && (
                              <span className="campaign-product-more">
                                +{tags.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="campaign-card-metrics">
                          <div className="card-metric">
                            <span className="metric-value">
                              {(campaign as any).totalLeads ?? (campaign as any).leadCount ?? 0}
                            </span>
                            <span className="metric-label">leads</span>
                          </div>
                          <div className="card-metric">
                            <span className="metric-value">
                              {(campaign as any).callableLeads ?? (campaign as any).leadCount ?? 0}
                            </span>
                            <span className="metric-label">callable</span>
                          </div>
                        </div>
                      </button>
                      <footer>
                        <button
                          type="button"
                          className="text-button card-open-action"
                          onClick={() => openCampaign(campaign._id)}
                        >
                          Open workspace <ChevronRight size={14} />
                        </button>
                        <button
                          type="button"
                          className="save-campaign-button saved"
                          title="Remove from My campaigns"
                          onClick={(e) => {
                            e.stopPropagation();
                            void removeFromMyCampaigns({
                              campaignId: campaign._id,
                            });
                          }}
                        >
                          <Bookmark size={13} fill="#111" />
                          <span>Saved</span>
                        </button>
                      </footer>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="portfolio-empty">
                <BookOpen size={24} />
                <strong>No campaigns selected</strong>
                <span>
                  Open a campaign in an organization and add it to My
                  campaigns when you want it in your working set.
                </span>
                <button
                  className="primary-button"
                  onClick={() => setActiveNav("Campaigns")}
                >
                  Browse campaigns
                </button>
              </div>
            )}
            {resourceError && (
              <p className="settings-error" role="alert">
                {resourceError}
              </p>
            )}
          </section>
        ) : activeNav === "Products" ? (
          <section className="resource-page product-catalog-page">
            {productEditorOpen ? (
              <div className="product-editor-view">
                <header className="campaign-detail-header product-editor-topbar">
                  <div>
                    <h1>{editingProductId ? "Edit product" : "New product"}</h1>
                    <p>
                      {editingProductId
                        ? "Update details, call playbook script, and qualified lead checklist."
                        : "Add a new product to your organization's catalog."}
                    </p>
                  </div>
                  <div className="header-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setProductEditorOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={(e) => {
                        const form = e.currentTarget
                          .closest(".product-editor-view")
                          ?.querySelector("form");
                        if (form) form.requestSubmit();
                      }}
                    >
                      Save product
                    </button>
                  </div>
                </header>

                <form className="product-editor-form" onSubmit={saveProduct}>
                  {/* Card 1: Product Details */}
                  <div className="product-editor-card">
                    <div className="editor-card-head">
                      <h3>1. Product Details</h3>
                      <span>Core identity and overview of what this product solves.</span>
                    </div>
                    <div className="form-grid-2col">
                      <label className="form-field">
                        <span className="field-label">Product name *</span>
                        <input
                          required
                          autoFocus
                          value={productDraft.name}
                          onChange={(event) =>
                            setProductDraft({
                              ...productDraft,
                              name: event.target.value,
                            })
                          }
                          placeholder="e.g. Website Development"
                        />
                      </label>
                      <label className="form-field">
                        <span className="field-label">Tags (comma-separated)</span>
                        <input
                          value={productDraft.tags}
                          onChange={(event) =>
                            setProductDraft({
                              ...productDraft,
                              tags: event.target.value,
                            })
                          }
                          placeholder="e.g. Website design, Local SEO, AI"
                        />
                      </label>
                    </div>
                    <label className="form-field">
                      <span className="field-label">Short description (What it solves) *</span>
                      <textarea
                        required
                        rows={2}
                        value={productDraft.description}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            description: event.target.value,
                          })
                        }
                        placeholder="What it does and solves in one or two clear sentences."
                      />
                    </label>
                  </div>

                  {/* Card 2: Call Playbook / Script */}
                  <div className="product-editor-card">
                    <div className="editor-card-head">
                      <h3>2. Call Playbook / Script</h3>
                      <span>The conversation flow and pitch structure reps use when calling for this product.</span>
                    </div>
                    <label className="form-field">
                      <span className="field-label">Call script & conversation flow</span>
                      <textarea
                        rows={5}
                        className="playbook-textarea"
                        value={productDraft.playbook}
                        onChange={(event) =>
                          setProductDraft({
                            ...productDraft,
                            playbook: event.target.value,
                          })
                        }
                        placeholder="1. Introduction: Hi [Lead Name], this is [Name] with [Company]...\n2. Problem Discovery: When prospective clients search for your services today...\n3. Value Proposition: We help businesses...\n4. Close: Would you have 15 minutes this Thursday for a quick audit?"
                      />
                    </label>
                  </div>

                  {/* Card 3: Sales Context */}
                  <div className="product-editor-card">
                    <div className="editor-card-head">
                      <h3>3. Sales Context & Pitching</h3>
                      <span>Contextual answers, ideal buyer profiles, and objection handling for live calls.</span>
                    </div>
                    <div className="form-grid-2col">
                      <label className="form-field">
                        <span className="field-label">Who we are</span>
                        <textarea
                          rows={3}
                          value={productDraft.whoWeAre}
                          onChange={(event) =>
                            setProductDraft({
                              ...productDraft,
                              whoWeAre: event.target.value,
                            })
                          }
                          placeholder="e.g. A hands-on web studio for local service businesses."
                        />
                      </label>
                      <label className="form-field">
                        <span className="field-label">Who we help (Ideal customer)</span>
                        <textarea
                          rows={3}
                          value={productDraft.whoWeHelp}
                          onChange={(event) =>
                            setProductDraft({
                              ...productDraft,
                              whoWeHelp: event.target.value,
                            })
                          }
                          placeholder="e.g. Owner-led Austin service businesses with an outdated website."
                        />
                      </label>
                      <label className="form-field">
                        <span className="field-label">Elevator pitch</span>
                        <textarea
                          rows={3}
                          value={productDraft.elevatorPitch}
                          onChange={(event) =>
                            setProductDraft({
                              ...productDraft,
                              elevatorPitch: event.target.value,
                            })
                          }
                          placeholder="e.g. We turn an outdated site into a clear path from search to booked work."
                        />
                      </label>
                      <label className="form-field">
                        <span className="field-label">Common objections</span>
                        <textarea
                          rows={3}
                          value={productDraft.commonObjections}
                          onChange={(event) =>
                            setProductDraft({
                              ...productDraft,
                              commonObjections: event.target.value,
                            })
                          }
                          placeholder="e.g. We already have a site / It sounds expensive."
                        />
                      </label>
                    </div>
                  </div>

                  {/* Card 4: Booking & Qualification */}
                  <div className="product-editor-card">
                    <div className="editor-card-head">
                      <h3>4. Meeting Booking & Qualification Checklist</h3>
                      <span>Calendar link and qualification criteria verified before booking meetings.</span>
                    </div>
                    <div className="form-grid-2col">
                      <label className="form-field">
                        <span className="field-label">Booking provider</span>
                        <select
                          value={productDraft.bookingProvider}
                          onChange={(event) =>
                            setProductDraft({
                              ...productDraft,
                              bookingProvider: event.target.value,
                            })
                          }
                        >
                          <option value="calcom">Cal.com</option>
                          <option value="calendly">Calendly</option>
                        </select>
                      </label>
                      <label className="form-field">
                        <span className="field-label">Booking link URL</span>
                        <input
                          type="url"
                          value={productDraft.bookingUrl}
                          onChange={(event) =>
                            setProductDraft({
                              ...productDraft,
                              bookingUrl: event.target.value,
                            })
                          }
                          placeholder="https://cal.com/..."
                        />
                      </label>
                    </div>

                    <div className="checklist-builder">
                      <span className="field-label">Qualified lead checklist</span>
                      <div className="criteria-list">
                        {productDraft.qualificationCriteria.map(
                          (criterion, index) => (
                            <div className="criterion-card-row" key={index}>
                              <input
                                className="criterion-input"
                                value={criterion.label}
                                onChange={(event) =>
                                  setProductDraft((current) => ({
                                    ...current,
                                    qualificationCriteria:
                                      current.qualificationCriteria.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                label: event.target.value,
                                              }
                                            : item,
                                      ),
                                  }))
                                }
                                placeholder="Criterion (e.g. Active local service business)"
                              />
                              <input
                                className="criterion-guidance"
                                value={criterion.guidance || ""}
                                onChange={(event) =>
                                  setProductDraft((current) => ({
                                    ...current,
                                    qualificationCriteria:
                                      current.qualificationCriteria.map(
                                        (item, itemIndex) =>
                                          itemIndex === index
                                            ? {
                                                ...item,
                                                guidance: event.target.value,
                                              }
                                            : item,
                                      ),
                                  }))
                                }
                                placeholder="Optional rep guidance"
                              />
                              <label className="criterion-req-label">
                                <input
                                  type="checkbox"
                                  checked={criterion.required}
                                  onChange={(event) =>
                                    setProductDraft((current) => ({
                                      ...current,
                                      qualificationCriteria:
                                        current.qualificationCriteria.map(
                                          (item, itemIndex) =>
                                            itemIndex === index
                                              ? {
                                                  ...item,
                                                  required:
                                                    event.target.checked,
                                                }
                                              : item,
                                        ),
                                    }))
                                  }
                                />
                                <span>Req</span>
                              </label>
                              <button
                                type="button"
                                className="icon-button destructive-button"
                                aria-label="Remove criterion"
                                onClick={() =>
                                  setProductDraft((current) => ({
                                    ...current,
                                    qualificationCriteria:
                                      current.qualificationCriteria.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                      ),
                                  }))
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                      <button
                        type="button"
                        className="secondary-button add-criterion-btn"
                        onClick={() =>
                          setProductDraft((current) => ({
                            ...current,
                            qualificationCriteria: [
                              ...current.qualificationCriteria,
                              { label: "", guidance: "", required: true },
                            ],
                          }))
                        }
                      >
                        <Plus size={14} /> Add criterion
                      </button>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="product-editor-footer">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setProductEditorOpen(false)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="primary-button">
                      Save product
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedProductId ? (
              (() => {
                const selectedProduct = products.find((p) => p._id === selectedProductId);
                if (!selectedProduct) {
                  return (
                    <div className="portfolio-empty">
                      <p>Product not found.</p>
                      <button className="primary-button" onClick={() => setSelectedProductId(null)}>
                        Back to products
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="product-detail-view">
                    <header className="campaign-detail-header">
                      <div>
                        <h1>{selectedProduct.name}</h1>
                        <p>
                          {selectedProduct.description ||
                            "Product overview, live call playbook, and qualification criteria."}
                        </p>
                      </div>
                      <div className="header-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => openProductEditor(selectedProduct)}
                        >
                          <Edit2 size={14} /> Edit product
                        </button>
                        <button
                          type="button"
                          className="secondary-button destructive-button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete ${selectedProduct.name}? It will be unlinked from all campaigns.`,
                              )
                            ) {
                              void removeProduct({ productId: selectedProduct._id }).then(() =>
                                setSelectedProductId(null),
                              );
                            }
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </header>

                    <div className="product-detail-content">
                      {/* Card 1: Product Details */}
                      <div className="product-editor-card">
                        <div className="editor-card-head">
                          <h3>1. Product Details</h3>
                          <span>Core identity and overview of what this product solves.</span>
                        </div>
                        <div className="product-detail-grid">
                          <div className="product-detail-item">
                            <span className="field-label">Product Name</span>
                            <strong>{selectedProduct.name}</strong>
                          </div>
                          {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                            <div className="product-detail-item">
                              <span className="field-label">Tags</span>
                              <div className="campaign-card-products" style={{ marginTop: 4 }}>
                                {selectedProduct.tags.map((tag: string) => (
                                  <span key={tag} className="campaign-product-pill">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="product-detail-item" style={{ gridColumn: "1 / -1" }}>
                            <span className="field-label">Short Description</span>
                            <p className="detail-text-block">
                              {selectedProduct.description || "No description provided."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Call Playbook / Script */}
                      <div className="product-editor-card">
                        <div className="editor-card-head">
                          <h3>2. Call Playbook / Script</h3>
                          <span>The conversation flow and pitch structure reps use when calling for this product.</span>
                        </div>
                        <div className="playbook-view-box">
                          {selectedProduct.playbook ? (
                            <pre className="playbook-script-pre">{selectedProduct.playbook}</pre>
                          ) : (
                            <p className="empty-copy">No script defined yet. Click "Edit product" to add a conversation flow.</p>
                          )}
                        </div>
                      </div>

                      {/* Card 3: Sales Context & Pitching */}
                      <div className="product-editor-card">
                        <div className="editor-card-head">
                          <h3>3. Sales Context & Pitching</h3>
                          <span>Contextual answers, ideal buyer profiles, and objection handling for live calls.</span>
                        </div>
                        <div className="form-grid-2col">
                          <div className="product-detail-item">
                            <span className="field-label">Who We Are</span>
                            <p className="detail-text-block">
                              {selectedProduct.whoWeAre || "Not specified."}
                            </p>
                          </div>
                          <div className="product-detail-item">
                            <span className="field-label">Who We Help (Ideal Customer)</span>
                            <p className="detail-text-block">
                              {selectedProduct.whoWeHelp || "Not specified."}
                            </p>
                          </div>
                          <div className="product-detail-item">
                            <span className="field-label">Elevator Pitch</span>
                            <p className="detail-text-block">
                              {selectedProduct.elevatorPitch || "Not specified."}
                            </p>
                          </div>
                          <div className="product-detail-item">
                            <span className="field-label">Common Objections</span>
                            <p className="detail-text-block">
                              {selectedProduct.commonObjections || "Not specified."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card 4: Meeting Booking & Qualification */}
                      <div className="product-editor-card">
                        <div className="editor-card-head">
                          <h3>4. Meeting Booking & Qualification Checklist</h3>
                          <span>Calendar integration and qualification criteria verified before booking meetings.</span>
                        </div>
                        <div className="form-grid-2col">
                          <div className="product-detail-item">
                            <span className="field-label">Booking Provider</span>
                            <strong>{selectedProduct.bookingProvider === "calendly" ? "Calendly" : "Cal.com"}</strong>
                          </div>
                          <div className="product-detail-item">
                            <span className="field-label">Booking Calendar URL</span>
                            {selectedProduct.bookingUrl ? (
                              <a
                                href={selectedProduct.bookingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="booking-link"
                              >
                                {selectedProduct.bookingUrl} <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="empty-copy" style={{ padding: 0 }}>No booking URL configured</span>
                            )}
                          </div>
                        </div>
                        <div className="product-detail-checklist">
                          <span className="field-label" style={{ marginBottom: 8, display: "block" }}>
                            Qualified Lead Checklist
                          </span>
                          {selectedProduct.qualificationCriteria && selectedProduct.qualificationCriteria.length > 0 ? (
                            <div className="criteria-list">
                              {selectedProduct.qualificationCriteria.map((c, i) => (
                                <div className="criterion-card-row" key={i}>
                                  <CheckCircle2 size={16} color={c.required ? "#111" : "#888"} />
                                  <div style={{ flex: 1 }}>
                                    <strong>{c.label}</strong>
                                    {c.guidance && (
                                      <span style={{ display: "block", fontSize: 11, color: "#666" }}>
                                        {c.guidance}
                                      </span>
                                    )}
                                  </div>
                                  {c.required && (
                                    <span className="campaign-product-pill" style={{ background: "#111", color: "#fff", fontSize: 10 }}>
                                      Required
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="empty-copy">No qualification criteria set.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                <header className="home-header">
                  <div>
                    <h1>Products</h1>
                    <p>
                      The organization catalog. Link products to a campaign when you
                      set it up.
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => openProductEditor()}
                  >
                    <Plus size={16} /> Add product
                  </button>
                </header>
                {(() => {
                  const PRODUCTS_PER_PAGE = 6;
                  const totalPages = Math.max(
                    1,
                    Math.ceil(products.length / PRODUCTS_PER_PAGE),
                  );
                  const currentPage = Math.min(productPage, totalPages);
                  const paginatedProducts = products.slice(
                    (currentPage - 1) * PRODUCTS_PER_PAGE,
                    currentPage * PRODUCTS_PER_PAGE,
                  );

                  return products.length ? (
                    <>
                      <div className="campaign-index">
                        {paginatedProducts.map((product) => (
                          <article className="campaign-card" key={product._id}>
                            <button
                              type="button"
                              className="campaign-card-main"
                              onClick={() => setSelectedProductId(product._id)}
                            >
                              <div className="campaign-card-header">
                                <div className="campaign-card-title-group">
                                  <strong>{product.name}</strong>
                                  <span className="campaign-card-subtitle">
                                    {product.whoWeHelp ? `Target: ${product.whoWeHelp}` : "Product"}
                                  </span>
                                </div>
                              </div>
                              <p className="product-description-snippet">
                                {product.description ||
                                  product.elevatorPitch ||
                                  "No description provided."}
                              </p>
                              {product.tags && product.tags.length > 0 && (
                                <div className="campaign-card-products">
                                  {product.tags.map((tag: string) => (
                                    <span key={tag} className="campaign-product-pill">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </button>
                            <footer>
                              <button
                                type="button"
                                className="text-button card-open-action"
                                onClick={() => setSelectedProductId(product._id)}
                              >
                                View product <ChevronRight size={14} />
                              </button>
                              <button
                                type="button"
                                className="icon-button destructive-button"
                                aria-label={`Delete ${product.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    window.confirm(
                                      `Delete ${product.name}? It will be unlinked from all campaigns.`,
                                    )
                                  )
                                    void removeProduct({ productId: product._id });
                                }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </footer>
                          </article>
                        ))}
                      </div>
                      {totalPages > 1 && (
                        <div
                          className="pagination-bar"
                          role="navigation"
                          aria-label="Product pagination"
                        >
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={currentPage <= 1}
                            onClick={() =>
                              setProductPage((p) => Math.max(1, p - 1))
                            }
                          >
                            Previous
                          </button>
                          <div className="pagination-pages">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                              (pageNum) => (
                                <button
                                  key={pageNum}
                                  type="button"
                                  className={`pagination-page-button ${pageNum === currentPage ? "active" : ""}`}
                                  onClick={() => setProductPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              ),
                            )}
                          </div>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={currentPage >= totalPages}
                            onClick={() =>
                              setProductPage((p) => Math.min(totalPages, p + 1))
                            }
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                  <div className="portfolio-empty">
                    <Package size={32} />
                    <strong>No products yet</strong>
                    <span>
                      Start with what your organization sells. Campaigns can then
                      choose the relevant products.
                    </span>
                    <button
                      className="primary-button"
                      onClick={() => openProductEditor()}
                    >
                      <Plus size={16} /> Add product
                    </button>
                  </div>
                );
              })()}
              </>
            )}
          </section>
        ) : activeNav === "Overview" ? (
          <section className="portfolio-page">
            <header className="home-header">
              <div>
                <h1>{organizationName}</h1>
                <p>
                  {(
                    organizationOverview?.organization as {
                      description?: string;
                    } | null
                  )?.description || "Your organization’s calling workspace."}
                </p>
              </div>
            </header>
            <div className="stats-grid">
              <article>
                <span>Campaigns</span>
                <strong>{organizationOverview?.campaigns.length || 0}</strong>
              </article>
              <article>
                <span>Products</span>
                <strong>{organizationOverview?.products.length || 0}</strong>
              </article>
              <article>
                <span>Members</span>
                <strong>{organizationOverview?.members.length || 0}</strong>
              </article>
              <article>
                <span>Recent activity</span>
                <strong>{organizationOverview?.activity.length || 0}</strong>
              </article>
            </div>
            <section className="recent-card">
              <h2>Recent activity</h2>
              {organizationActivity.slice(0, 6).map((item) => (
                <div className="recent-call" key={item._id}>
                  <span className="recent-icon">
                    <ActivityIcon size={16} />
                  </span>
                  <div>
                    <strong>{item.message}</strong>
                    <small>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                </div>
              ))}
              {!organizationActivity.length && (
                <p className="empty-copy">
                  Organization activity will appear here.
                </p>
              )}
            </section>
          </section>
        ) : activeNav === "Members" ? (
          <section className="resource-page">
            <header className="home-header">
              <div>
                <h1>Members</h1>
                <p>People who can work this organization.</p>
              </div>
            </header>
            <form
              className="resource-form compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void inviteMember({ ...memberDraft, role: "member" }).then(() =>
                  setMemberDraft({ name: "", email: "", title: "" }),
                );
              }}
            >
              <label>
                Name
                <input
                  required
                  value={memberDraft.name}
                  onChange={(event) =>
                    setMemberDraft({ ...memberDraft, name: event.target.value })
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={memberDraft.email}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      email: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Title
                <input
                  value={memberDraft.title}
                  onChange={(event) =>
                    setMemberDraft({
                      ...memberDraft,
                      title: event.target.value,
                    })
                  }
                />
              </label>
              <button className="primary-button">
                <UserPlus size={16} /> Invite
              </button>
            </form>
            <div className="resource-list">
              {organizationMembers.map((member) => (
                <div key={member._id}>
                  <strong>{member.name}</strong>
                  <span>
                    {member.title || member.role} · {member.email}
                  </span>
                  <button
                    className="secondary-button destructive-button"
                    onClick={() => void removeMember({ memberId: member._id })}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : activeNav === "Activity" ? (
          <section className="portfolio-page">
            <header className="home-header">
              <div>
                <h1>Activity</h1>
                <p>A record of changes and work across {organizationName}.</p>
              </div>
            </header>
            <section className="recent-card activity-feed">
              {organizationActivity.length ? (
                organizationActivity.map((item) => (
                  <div className="recent-call" key={item._id}>
                    <span className="recent-icon">
                      <ActivityIcon size={16} />
                    </span>
                    <div>
                      <strong>{item.message}</strong>
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-copy">No activity yet.</p>
              )}
            </section>
          </section>
        ) : activeNav === "Acquaintances" ? (
          <section className="resource-page">
            <header className="home-header">
              <div>
                <h1>Acquaintances</h1>
                <p>Your professional network outside of prospecting.</p>
              </div>
            </header>
            <form
              className="resource-form compact-form"
              onSubmit={(event) => {
                event.preventDefault();
                void addAcquaintance(acquaintanceDraft).then(() =>
                  setAcquaintanceDraft({ name: "", email: "" }),
                );
              }}
            >
              <label>
                Name
                <input
                  required
                  value={acquaintanceDraft.name}
                  onChange={(event) =>
                    setAcquaintanceDraft({
                      ...acquaintanceDraft,
                      name: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={acquaintanceDraft.email}
                  onChange={(event) =>
                    setAcquaintanceDraft({
                      ...acquaintanceDraft,
                      email: event.target.value,
                    })
                  }
                />
              </label>
              <button className="primary-button">
                <Plus size={16} /> Add
              </button>
            </form>
            <div className="resource-list">
              {acquaintances.map((item) => (
                <div key={item._id}>
                  <strong>{item.name}</strong>
                  <span>
                    {item.email} · {item.status}
                  </span>
                  <div>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        void updateAcquaintance({
                          acquaintanceId: item._id,
                          status: "accepted",
                        })
                      }
                    >
                      Accept
                    </button>
                    <button
                      className="secondary-button destructive-button"
                      onClick={() =>
                        void removeAcquaintance({ acquaintanceId: item._id })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : activeNav === "Campaigns" ? (
          <section className="campaign-page">
            {!selectedCampaignId ? (
              <>
                <header className="home-header">
                  <div>
                    <h1>Campaigns</h1>
                    <p>Choose one selling motion at a time.</p>
                  </div>
                  <div className="campaign-header-actions">
                    <button
                      className="secondary-button"
                      disabled={demoSeeding}
                      onClick={() => void addDemoData()}
                    >
                      {demoSeeding ? "Adding workspace…" : "Add workspace data"}
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => setCreateCampaignOpen(true)}
                    >
                      <Plus size={16} /> Add campaign
                    </button>
                  </div>
                </header>
                {(() => {
                  const allCampaigns = campaignWorkspace?.campaigns || [];
                  const CAMPAIGNS_PER_PAGE = 6;
                  const totalPages = Math.max(
                    1,
                    Math.ceil(allCampaigns.length / CAMPAIGNS_PER_PAGE),
                  );
                  const currentPage = Math.min(campaignPage, totalPages);
                  const paginated = allCampaigns.slice(
                    (currentPage - 1) * CAMPAIGNS_PER_PAGE,
                    currentPage * CAMPAIGNS_PER_PAGE,
                  );
                  return (
                    <>
                      <div className="campaign-index">
                        {paginated.map((campaign) => {
                          const offer = campaignWorkspace?.offers.find(
                            (item) => item._id === campaign.offerId,
                          );
                          const isActive =
                            dialerWorkspace?.activeCampaign?._id === campaign._id;
                          const isSaved = myCampaigns.some(
                            (item) => item._id === campaign._id,
                          );
                          const displayProducts =
                            (campaign as any).products && (campaign as any).products.length > 0
                              ? (campaign as any).products
                              : null;
                          const tags = displayProducts
                            ? displayProducts.map((p: any) => p.name)
                            : [];
                          return (
                            <article
                              className="campaign-card"
                              key={campaign._id}
                            >
                              <button
                                type="button"
                                className="campaign-card-main"
                                onClick={() => openCampaign(campaign._id)}
                              >
                                <div className="campaign-card-header">
                                  <div className="campaign-card-title-group">
                                    <strong>{campaign.name}</strong>
                                    <span className="campaign-card-subtitle">
                                      {campaign.status === "active"
                                        ? "Ready to dial"
                                        : "Draft"}
                                    </span>
                                  </div>
                                </div>
                                {tags.length > 0 && (
                                  <div className="campaign-card-products">
                                    {tags.slice(0, 3).map((tag: string) => (
                                      <span className="campaign-product-pill" key={tag}>
                                        {tag}
                                      </span>
                                    ))}
                                    {tags.length > 3 && (
                                      <span className="campaign-product-more">
                                        +{tags.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <div className="campaign-card-metrics">
                                  <div className="card-metric">
                                    <span className="metric-value">{(campaign as any).totalLeads ?? 0}</span>
                                    <span className="metric-label">leads</span>
                                  </div>
                                  <div className="card-metric">
                                    <span className="metric-value">{(campaign as any).callableLeads ?? 0}</span>
                                    <span className="metric-label">callable</span>
                                  </div>
                                </div>
                              </button>
                              <footer>
                                <button
                                  type="button"
                                  className="text-button card-open-action"
                                  onClick={() => openCampaign(campaign._id)}
                                >
                                  Open workspace <ChevronRight size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={`save-campaign-button ${isSaved ? "saved" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isSaved) {
                                      void addToMyCampaigns({ campaignId: campaign._id });
                                    } else {
                                      void removeFromMyCampaigns({ campaignId: campaign._id });
                                    }
                                  }}
                                >
                                  <Bookmark size={13} fill={isSaved ? "#111" : "none"} />
                                  <span>{isSaved ? "Saved" : "Save"}</span>
                                </button>
                              </footer>
                            </article>
                          );
                        })}
                      </div>
                      {totalPages > 1 && (
                        <div className="pagination-bar" role="navigation" aria-label="Campaign pagination">
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={currentPage <= 1}
                            onClick={() => setCampaignPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </button>
                          <div className="pagination-pages">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                              (pageNum) => (
                                <button
                                  key={pageNum}
                                  type="button"
                                  className={`pagination-page-button ${pageNum === currentPage ? "active" : ""}`}
                                  onClick={() => setCampaignPage(pageNum)}
                                >
                                  {pageNum}
                                </button>
                              ),
                            )}
                          </div>
                          <button
                            type="button"
                            className="secondary-button"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCampaignPage((p) => Math.min(totalPages, p + 1))}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
                {createCampaignOpen && (
                  <div className="campaign-modal-backdrop" role="presentation">
                    <form
                      className="campaign-create-modal"
                      onSubmit={saveCampaign}
                    >
                      <header>
                        <div>
                          <h2>Add campaign</h2>
                          <p>
                            Set the selling motion first. Upload leads once the
                            campaign is created.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => setCreateCampaignOpen(false)}
                          aria-label="Close"
                        >
                          Close
                        </button>
                      </header>
                      <label>
                        Campaign name
                        <input
                          required
                          autoFocus
                          value={newCampaignSetup.name}
                          onChange={(event) =>
                            setNewCampaignSetup((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="SMB websites — Texas"
                        />
                      </label>
                      <div className="modal-section">
                        <h3>Product</h3>
                        <label>
                          Link a product
                          <select
                            value={newCampaignSetup.productId}
                            onChange={(event) =>
                              setNewCampaignSetup((current) => ({
                                ...current,
                                productId: event.target.value,
                              }))
                            }
                          >
                            <option value="">None — link one later</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="modal-section">
                        <h3>Playbook</h3>
                        <label>
                          Playbook name
                          <input
                            value={newCampaignSetup.playbookName}
                            onChange={(event) =>
                              setNewCampaignSetup((current) => ({
                                ...current,
                                playbookName: event.target.value,
                              }))
                            }
                            placeholder="Texas website opener"
                          />
                        </label>
                        <label>
                          Call guidance
                          <textarea
                            value={newCampaignSetup.playbookBody}
                            onChange={(event) =>
                              setNewCampaignSetup((current) => ({
                                ...current,
                                playbookBody: event.target.value,
                              }))
                            }
                            placeholder="Opening, discovery, and objections."
                          />
                        </label>
                      </div>
                      <footer>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setCreateCampaignOpen(false)}
                        >
                          Cancel
                        </button>
                        <button className="primary-button">
                          Create campaign
                        </button>
                      </footer>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <>
                {campaignDetail && (
                  <>
                    <header className="campaign-detail-header">
                      <div>
                        {editingCampaignName ? (
                          <div className="campaign-title-editor">
                            <input
                              value={campaignNameDraft}
                              onChange={(event) =>
                                setCampaignNameDraft(event.target.value)
                              }
                            />
                            <button
                              className="secondary-button"
                              onClick={() => void saveCampaignName()}
                            >
                              Save
                            </button>
                            <button
                              className="text-button"
                              onClick={() => setEditingCampaignName(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <h1>{campaignDetail.campaign.name}</h1>
                            <p>
                              {campaignDetail.leadLists.reduce(
                                (total, list) =>
                                  total + (list?.queuedCount || 0),
                                0,
                              )}{" "}
                              callable leads · {campaignDetail.campaign.status}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="campaign-header-actions">
                        <button
                          className="secondary-button"
                          onClick={() => setEditingCampaignName(true)}
                        >
                          Rename
                        </button>
                        <button
                          className="secondary-button destructive-button"
                          onClick={() => void removeCampaign()}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => setCampaignSection("Leads")}
                        >
                          <LayoutList size={15} /> All leads
                        </button>
                      </div>
                    </header>
                    <nav
                      className="campaign-tabs"
                      aria-label="Campaign sections"
                    >
                      {(
                        ["Overview", "Product", "Leads", "Playbook"] as const
                      ).map((section) => (
                        <button
                          key={section}
                          className={
                            campaignSection === section ? "selected" : ""
                          }
                          onClick={() => setCampaignSection(section)}
                        >
                          {section}
                        </button>
                      ))}
                    </nav>
                    {campaignSection === "Overview" && (
                      <section className="campaign-workspace">
                          <header className="campaign-workspace-header">
                            <div>
                              <h2>Leads</h2>
                              <p>
                                {campaignDetail.leads.length} leads in this
                                campaign · select a lead to open it in Dial
                              </p>
                            </div>
                            <div>
                              <label className="secondary-button csv-import-button">
                                <input
                                  type="file"
                                  accept=".csv,text/csv"
                                  onChange={(event) => {
                                    void selectCsv(
                                      event.target.files?.[0],
                                      campaignDetail.campaign._id,
                                    );
                                    event.currentTarget.value = "";
                                  }}
                                />
                                Import leads <Plus size={15} />
                              </label>
                              <button
                                className="primary-button"
                                disabled={
                                  !campaignDetail.leads.some(
                                    (lead) =>
                                      lead.status === "queued" ||
                                      lead.status === "working",
                                  )
                                }
                                onClick={() =>
                                  void startCampaign(
                                    campaignDetail.campaign._id,
                                  )
                                }
                              >
                                <Phone size={15} /> Start dialing
                              </button>
                            </div>
                          </header>
                          {campaignDetail.leads.length ? (
                            <div
                              className="campaign-lead-table"
                              role="table"
                              aria-label="Campaign leads"
                            >
                              <div className="campaign-lead-head" role="row">
                                <span />
                                <span>Lead</span>
                                <span>Phone</span>
                                <span>Industry</span>
                                <span>Location</span>
                                <span>Rating</span>
                                <span>Links</span>
                                <span>Status</span>
                              </div>
                              {campaignDetail.leads.map((lead) => {
                                const name =
                                  [lead.firstName, lead.lastName]
                                    .filter(Boolean)
                                    .join(" ") ||
                                  lead.company ||
                                  "Unnamed lead";
                                const leadStatus =
                                  lead.status === "working"
                                    ? "In call"
                                    : lead.status === "completed"
                                      ? "Completed"
                                      : lead.status === "do_not_call"
                                        ? "Do not call"
                                        : "Ready";
                                return (
                                  <div
                                    className="campaign-lead-row"
                                    key={lead._id}
                                    role="row"
                                  >
                                    <span role="cell">
                                      <button
                                        className="lead-dial-button"
                                        aria-label={`Open ${name} in Dial`}
                                        disabled={
                                          lead.status === "completed" ||
                                          lead.status === "do_not_call"
                                        }
                                        onClick={() =>
                                          void dialCampaignLead(
                                            lead._id,
                                            lead.leadListId,
                                          )
                                        }
                                      >
                                        <Phone size={14} />
                                      </button>
                                    </span>
                                    <span className="lead-person" role="cell">
                                      <strong>{name}</strong>
                                      <small>
                                        {lead.company ||
                                          lead.title ||
                                          "No company added"}
                                      </small>
                                    </span>
                                    <span role="cell">{lead.phone || "—"}</span>
                                    <span role="cell">
                                      {lead.industry || "—"}
                                    </span>
                                    <span role="cell">
                                      {lead.location || "—"}
                                    </span>
                                    <span role="cell">
                                      {lead.rating ? `★ ${lead.rating}` : "—"}
                                    </span>
                                    <span className="lead-links" role="cell">
                                      {lead.googleMapsUrl && (
                                        <a
                                          href={lead.googleMapsUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          Maps
                                        </a>
                                      )}
                                      {lead.website && (
                                        <a
                                          href={lead.website}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          Website
                                        </a>
                                      )}
                                      {!lead.googleMapsUrl &&
                                        !lead.website &&
                                        "—"}
                                    </span>
                                    <span role="cell">
                                      <b
                                        className={`lead-status status-${lead.status}`}
                                      >
                                        {leadStatus}
                                      </b>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="campaign-workspace-empty">
                              <FileText size={22} />
                              <strong>No leads attached</strong>
                              <span>
                                Attach a lead list to see its records here.
                              </span>
                            </div>
                          )}
                        </section>
                    )}
                    {campaignSection === "Product" && (() => {
                      const linkedProductIds = new Set(
                        campaignDetail.products
                          .filter((p) => p != null)
                          .map((p) => p!._id),
                      );
                      return (
                        <section className="campaign-workspace">
                          <header className="campaign-workspace-header">
                            <div>
                              <h2>Products</h2>
                              <p>
                                Select the products sold in this campaign ({campaignDetail.products.filter(Boolean).length} linked).
                              </p>
                            </div>
                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() => {
                                setSelectedCampaignId(null);
                                setActiveNav("Products");
                              }}
                            >
                              Manage catalog
                            </button>
                          </header>
                          {products.length ? (
                            <div className="campaign-index" style={{ padding: "20px", marginTop: 0 }}>
                              {products.map((product) => {
                                const isLinked = linkedProductIds.has(product._id);
                                return (
                                  <article className="campaign-card" key={product._id}>
                                    <button
                                      type="button"
                                      className="campaign-card-main"
                                      onClick={() =>
                                        void toggleProductInCampaign({
                                          campaignId: campaignDetail.campaign._id,
                                          productId: product._id,
                                        })
                                      }
                                    >
                                      <div className="campaign-card-header">
                                        <div className="campaign-card-title-group">
                                          <strong>{product.name}</strong>
                                          <span className="campaign-card-subtitle">
                                            {product.whoWeHelp ? `Target: ${product.whoWeHelp}` : "Product"}
                                          </span>
                                        </div>
                                      </div>
                                      <p className="product-description-snippet">
                                        {product.description ||
                                          product.elevatorPitch ||
                                          "No description provided."}
                                      </p>
                                      {product.tags && product.tags.length > 0 && (
                                        <div className="campaign-card-products">
                                          {product.tags.map((tag: string) => (
                                            <span key={tag} className="campaign-product-pill">
                                              {tag}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </button>
                                    <footer>
                                      <span className="card-open-action">
                                        {isLinked ? "Included in campaign" : "Not included"}
                                      </span>
                                      <button
                                        type="button"
                                        className={`save-campaign-button ${isLinked ? "saved" : ""}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void toggleProductInCampaign({
                                            campaignId: campaignDetail.campaign._id,
                                            productId: product._id,
                                          });
                                        }}
                                      >
                                        <Bookmark size={13} fill={isLinked ? "#111" : "none"} />
                                        <span>{isLinked ? "Linked" : "Link"}</span>
                                      </button>
                                    </footer>
                                  </article>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="campaign-workspace-empty">
                              <Package size={22} />
                              <strong>No products in catalog</strong>
                              <span>Add products in the Products catalog to attach them to campaigns.</span>
                            </div>
                          )}
                        </section>
                      );
                    })()}
                    {campaignSection === "Leads" && (
                      <section className="campaign-workspace">
                        <header className="campaign-workspace-header">
                          <div>
                            <h2>Leads</h2>
                            <p>
                              {campaignDetail.leads.length} leads combined in this campaign.
                            </p>
                          </div>
                          <div>
                            <label className="secondary-button csv-import-button">
                              <input
                                type="file"
                                accept=".csv,text/csv"
                                onChange={(event) => {
                                  void selectCsv(
                                    event.target.files?.[0],
                                    campaignDetail.campaign._id,
                                  );
                                  event.currentTarget.value = "";
                                }}
                              />
                              Import leads <Plus size={15} />
                            </label>
                          </div>
                        </header>
                        {csvPreview &&
                        csvCampaignId === campaignDetail.campaign._id ? (
                          <section className="campaign-import-mapper">
                            <div>
                              <h2>Map your CSV headers</h2>
                              <p>
                                {csvPreview.rows.length} rows from{" "}
                                {csvPreview.fileName}. Map the columns before
                                importing them into this campaign.
                              </p>
                            </div>
                            <div className="csv-mapping-fields">
                              {(
                                [
                                  ["firstName", "First name"],
                                  ["lastName", "Last name"],
                                  ["email", "Email"],
                                  ["phone", "Phone"],
                                  ["company", "Company"],
                                  ["title", "Title"],
                                  ["industry", "Industry"],
                                  ["location", "Location"],
                                  ["website", "Website"],
                                  ["googleMapsUrl", "Google Maps URL"],
                                  ["rating", "Rating"],
                                ] as [keyof ImportedLead, string][]
                              ).map(([field, label]) => (
                                <label key={field}>
                                  {label}
                                  <select
                                    value={csvMapping[field]}
                                    onChange={(event) =>
                                      setCsvMapping((current) => ({
                                        ...current,
                                        [field]: event.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">Do not import</option>
                                    {csvPreview.headers.map((header) => (
                                      <option key={header} value={header}>
                                        {header}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ))}
                            </div>
                            <div className="csv-mapper-actions">
                              <button
                                className="secondary-button"
                                onClick={() => {
                                  setCsvPreview(null);
                                  setCsvCampaignId(null);
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                className="primary-button"
                                disabled={csvImporting}
                                onClick={() => void importMappedCsv()}
                              >
                                {csvImporting
                                  ? "Importing…"
                                  : `Import ${csvPreview.rows.length} leads`}
                              </button>
                            </div>
                          </section>
                        ) : campaignDetail.leads.length ? (
                          <div
                            className="campaign-lead-table"
                            role="table"
                            aria-label="Campaign leads"
                          >
                            <div className="campaign-lead-head" role="row">
                              <span />
                              <span>Lead</span>
                              <span>Phone</span>
                              <span>Industry</span>
                              <span>Location</span>
                              <span>Rating</span>
                              <span>Links</span>
                              <span>Status</span>
                            </div>
                            {campaignDetail.leads.map((lead) => {
                              const name =
                                [lead.firstName, lead.lastName]
                                  .filter(Boolean)
                                  .join(" ") ||
                                lead.company ||
                                "Unnamed lead";
                              const leadStatus =
                                lead.status === "working"
                                  ? "In call"
                                  : lead.status === "completed"
                                    ? "Completed"
                                    : lead.status === "do_not_call"
                                      ? "Do not call"
                                      : "Ready";
                              return (
                                <div
                                  className="campaign-lead-row"
                                  key={lead._id}
                                  role="row"
                                >
                                  <span role="cell">
                                    <button
                                      className="lead-dial-button"
                                      aria-label={`Open ${name} in Dial`}
                                      disabled={
                                        lead.status === "completed" ||
                                        lead.status === "do_not_call"
                                      }
                                      onClick={() =>
                                        void dialCampaignLead(
                                          lead._id,
                                          lead.leadListId,
                                        )
                                      }
                                    >
                                      <Phone size={14} />
                                    </button>
                                  </span>
                                  <span className="lead-person" role="cell">
                                    <strong>{name}</strong>
                                    <small>
                                      {lead.company ||
                                        lead.title ||
                                        "No company added"}
                                    </small>
                                  </span>
                                  <span role="cell">{lead.phone || "—"}</span>
                                  <span role="cell">
                                    {lead.industry || "—"}
                                  </span>
                                  <span role="cell">
                                    {lead.location || "—"}
                                  </span>
                                  <span role="cell">
                                    {lead.rating ? `★ ${lead.rating}` : "—"}
                                  </span>
                                  <span className="lead-links" role="cell">
                                    {lead.googleMapsUrl && (
                                      <a
                                        href={lead.googleMapsUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Maps
                                      </a>
                                    )}
                                    {lead.website && (
                                      <a
                                        href={lead.website}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        Website
                                      </a>
                                    )}
                                    {!lead.googleMapsUrl &&
                                      !lead.website &&
                                      "—"}
                                  </span>
                                  <span role="cell">
                                    <b
                                      className={`lead-status status-${lead.status}`}
                                    >
                                      {leadStatus}
                                    </b>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="campaign-workspace-empty">
                            <FileText size={22} />
                            <strong>No leads attached</strong>
                            <span>
                              Import a CSV to add leads directly into this campaign.
                            </span>
                          </div>
                        )}
                      </section>
                    )}
                    {campaignSection === "Playbook" && (
                      <form
                        className="campaign-form-detail"
                        onSubmit={savePlaybookForCampaign}
                      >
                        <label>
                          Playbook name
                          <input
                            required
                            value={campaignPlaybookDraft.name}
                            onChange={(event) =>
                              setCampaignPlaybookDraft((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            placeholder="e.g. Texas website opener"
                          />
                        </label>
                        <label>
                          Call guidance
                          <textarea
                            required
                            value={campaignPlaybookDraft.body}
                            onChange={(event) =>
                              setCampaignPlaybookDraft((current) => ({
                                ...current,
                                body: event.target.value,
                              }))
                            }
                            placeholder="Opening, discovery questions, objection handling, and follow-up guidance."
                          />
                        </label>
                        <div className="form-actions">
                          <button className="primary-button">
                            Save playbook
                          </button>
                          {campaignDetail.playbook && (
                            <button
                              type="button"
                              className="secondary-button destructive-button"
                              onClick={() => void removePlaybook()}
                            >
                              Delete playbook
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                  </>
                )}
              </>
            )}
            {resourceError && (
              <p className="settings-error" role="alert">
                {resourceError}
              </p>
            )}
          </section>
        ) : ["Offers", "Playbooks"].includes(activeNav) ? (
          <section className="resource-page">
            {activeNav === "Offers" && (
              <>
                <header className="resource-page-header">
                  <div>
                    <h1>Offers</h1>
                    <p>Define what each campaign is selling.</p>
                  </div>
                </header>
                <form className="resource-form" onSubmit={saveOffer}>
                  <label>
                    Name
                    <input
                      required
                      value={offerDraft.name}
                      onChange={(event) =>
                        setOfferDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. Managed outbound service"
                    />
                  </label>
                  <label>
                    Description
                    <textarea
                      value={offerDraft.description}
                      onChange={(event) =>
                        setOfferDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="The promise, proof, and pains this offer addresses."
                    />
                  </label>
                  <button className="primary-button">Save offer</button>
                </form>
                <div className="resource-list">
                  {campaignWorkspace?.offers.map((offer) => (
                    <div key={offer._id}>
                      <strong>{offer.name}</strong>
                      <span>{offer.description || "No description yet."}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {activeNav === "Playbooks" && (
              <>
                <header className="resource-page-header">
                  <div>
                    <h1>Playbooks</h1>
                    <p>Give each campaign a repeatable conversation flow.</p>
                  </div>
                </header>
                <form className="resource-form" onSubmit={savePlaybook}>
                  <label>
                    Name
                    <input
                      required
                      value={playbookDraft.name}
                      onChange={(event) =>
                        setPlaybookDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. VP Revenue opener"
                    />
                  </label>
                  <label>
                    Guidance
                    <textarea
                      required
                      value={playbookDraft.body}
                      onChange={(event) =>
                        setPlaybookDraft((current) => ({
                          ...current,
                          body: event.target.value,
                        }))
                      }
                      placeholder="Opener, discovery questions, qualification criteria, and objection guidance."
                    />
                  </label>
                  <button className="primary-button">Save playbook</button>
                </form>
                <div className="resource-list">
                  {campaignWorkspace?.playbooks.map((playbook) => (
                    <div key={playbook._id}>
                      <strong>{playbook.name}</strong>
                      <span>{playbook.body}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {activeNav === "Campaigns" && (
              <>
                <header className="resource-page-header">
                  <div>
                    <h1>Campaigns</h1>
                    <p>
                      Bring the offer, lead lists, and playbook into one
                      dialable workflow.
                    </p>
                  </div>
                </header>
                <form
                  className="resource-form campaign-form"
                  onSubmit={saveCampaign}
                >
                  <label>
                    Name
                    <input
                      required
                      value={campaignDraft.name}
                      onChange={(event) =>
                        setCampaignDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. West Coast prospecting"
                    />
                  </label>
                  <label>
                    Offer
                    <select
                      value={campaignDraft.offerId}
                      onChange={(event) =>
                        setCampaignDraft((current) => ({
                          ...current,
                          offerId: event.target.value,
                        }))
                      }
                    >
                      <option value="">No offer yet</option>
                      {campaignWorkspace?.offers.map((offer) => (
                        <option key={offer._id} value={offer._id}>
                          {offer.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Playbook
                    <select
                      value={campaignDraft.playbookId}
                      onChange={(event) =>
                        setCampaignDraft((current) => ({
                          ...current,
                          playbookId: event.target.value,
                        }))
                      }
                    >
                      <option value="">No playbook yet</option>
                      {campaignWorkspace?.playbooks.map((playbook) => (
                        <option key={playbook._id} value={playbook._id}>
                          {playbook.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <fieldset>
                    <legend>Lead lists</legend>
                    {campaignWorkspace?.leadLists.length ? (
                      campaignWorkspace.leadLists.map((list) => (
                        <label key={list._id} className="check-row">
                          <input
                            type="checkbox"
                            checked={campaignDraft.leadListIds.includes(
                              list._id,
                            )}
                            onChange={() =>
                              setCampaignDraft((current) => ({
                                ...current,
                                leadListIds: current.leadListIds.includes(
                                  list._id,
                                )
                                  ? current.leadListIds.filter(
                                      (id) => id !== list._id,
                                    )
                                  : [...current.leadListIds, list._id],
                              }))
                            }
                          />{" "}
                          {list.name}
                        </label>
                      ))
                    ) : (
                      <span>Import a lead list first.</span>
                    )}
                  </fieldset>
                  <button className="primary-button">Create campaign</button>
                </form>
                <div className="resource-list">
                  {campaignWorkspace?.campaigns.map((campaign) => (
                    <div key={campaign._id}>
                      <strong>{campaign.name}</strong>
                      <span>
                        {campaign.status} · {campaign.leadListIds?.length || 0}{" "}
                        lead lists attached
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {resourceError && (
              <p className="settings-error" role="alert">
                {resourceError}
              </p>
            )}
          </section>
        ) : activeNav === "Lead lists" ? (
          <section className="resource-page lead-lists-page">
            <header className="home-header">
              <div>
                <h1>Leads</h1>
                <p>
                  All leads in your organization ({allLeads.length} total).
                </p>
              </div>
              <div>
                <button
                  className="secondary-button"
                  onClick={() => setActiveNav("Campaigns")}
                >
                  View campaigns
                </button>
              </div>
            </header>
            {csvImportMessage && (
              <p className="csv-import-message" role="status">
                {csvImportMessage}
              </p>
            )}
            {csvPreview ? (
              <section className="csv-mapper">
                <div>
                  <h2>Map your columns</h2>
                  <p>
                    {csvPreview.rows.length} rows from {csvPreview.fileName}.
                    Choose where each column belongs before importing.
                  </p>
                </div>
                <div className="csv-mapping-fields">
                  {(
                    [
                      ["firstName", "First name"],
                      ["lastName", "Last name"],
                      ["email", "Email"],
                      ["phone", "Phone"],
                      ["company", "Company"],
                      ["title", "Title"],
                      ["industry", "Industry"],
                      ["location", "Location"],
                      ["website", "Website"],
                      ["googleMapsUrl", "Google Maps URL"],
                      ["rating", "Rating"],
                    ] as [keyof ImportedLead, string][]
                  ).map(([field, label]) => (
                    <label key={field}>
                      {label}
                      <select
                        value={csvMapping[field]}
                        onChange={(event) =>
                          setCsvMapping((current) => ({
                            ...current,
                            [field]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Do not import</option>
                        {csvPreview.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="csv-preview">
                  <strong>Preview</strong>
                  <div>
                    {csvPreview.headers.map((header) => (
                      <span key={header}>{header}</span>
                    ))}
                  </div>
                  {csvPreview.rows.slice(0, 4).map((row, index) => (
                    <div key={index}>
                      {csvPreview.headers.map((header, cell) => (
                        <span key={header}>{row[cell]}</span>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="csv-mapper-actions">
                  <button
                    className="secondary-button"
                    onClick={() => setCsvPreview(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="primary-button"
                    disabled={csvImporting}
                    onClick={() => void importMappedCsv()}
                  >
                    {csvImporting
                      ? "Importing…"
                      : `Import ${csvPreview.rows.length} leads`}
                  </button>
                </div>
              </section>
            ) : allLeads.length ? (
              <div
                className="campaign-lead-table"
                role="table"
                aria-label="All leads"
              >
                <div className="campaign-lead-head" role="row">
                  <span />
                  <span>Lead</span>
                  <span>Phone</span>
                  <span>Industry</span>
                  <span>Location</span>
                  <span>Rating</span>
                  <span>Links</span>
                  <span>Status</span>
                </div>
                {allLeads.map((lead) => {
                  const name =
                    [lead.firstName, lead.lastName].filter(Boolean).join(" ") ||
                    lead.company ||
                    "Unnamed lead";
                  const leadStatus =
                    lead.status === "working"
                      ? "In call"
                      : lead.status === "completed"
                        ? "Completed"
                        : lead.status === "do_not_call"
                          ? "Do not call"
                          : "Ready";
                  return (
                    <div
                      className="campaign-lead-row"
                      key={lead._id}
                      role="row"
                    >
                      <span role="cell">
                        <button
                          className="lead-dial-button"
                          aria-label={`Open ${name} in Dial`}
                          disabled={
                            lead.status === "completed" ||
                            lead.status === "do_not_call"
                          }
                          onClick={() =>
                            void dialCampaignLead(lead._id, lead.leadListId)
                          }
                        >
                          <Phone size={14} />
                        </button>
                      </span>
                      <span className="lead-person" role="cell">
                        <strong>{name}</strong>
                        <small>
                          {lead.company ||
                            lead.title ||
                            "No company added"}
                        </small>
                      </span>
                      <span role="cell">{lead.phone || "—"}</span>
                      <span role="cell">{lead.industry || "—"}</span>
                      <span role="cell">{lead.location || "—"}</span>
                      <span role="cell">
                        {lead.rating ? `★ ${lead.rating}` : "—"}
                      </span>
                      <span className="lead-links" role="cell">
                        {lead.googleMapsUrl && (
                          <a
                            href={lead.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Maps
                          </a>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Website
                          </a>
                        )}
                        {!lead.googleMapsUrl && !lead.website && "—"}
                      </span>
                      <span role="cell">
                        <b
                          className={`lead-status status-${lead.status}`}
                        >
                          {leadStatus}
                        </b>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="campaign-workspace-empty">
                <FileText size={22} />
                <strong>No leads yet</strong>
                <span>
                  Import CSV files into your campaigns to see all leads combined here.
                </span>
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="queue-bar">
              <div className="queue-heading">
                <span className="status-dot" />{" "}
                <strong>
                  {dialerWorkspace?.activeLeadList?.name ||
                    "Choose a lead list"}
                </strong>
                <span className="queue-count">
                  {leads.length} contacts remaining
                </span>
                <button
                  className={`sip-connection ${sipStatus}`}
                  onClick={openNumbersSettings}
                >
                  {sipStatus === "registered"
                    ? "SIP connected"
                    : sipStatus === "connecting"
                      ? "SIP connecting"
                      : "Connect SIP"}
                </button>
              </div>
              <div className="queue-actions">
                <button
                  className="text-button"
                  onClick={() =>
                    dialerWorkspace?.activeCampaign
                      ? openCampaign(dialerWorkspace.activeCampaign._id)
                      : setActiveNav("My campaigns")
                  }
                >
                  <Settings size={16} /> Campaign setup
                </button>
                {callState === "ready" ? (
                  <button
                    className="start-dialing"
                    onClick={startCall}
                    disabled={!leads.length}
                  >
                    <Phone size={15} />{" "}
                    {leads.length
                      ? `Dial ${lead.name.split(" ")[0]}`
                      : "No leads queued"}
                  </button>
                ) : callState === "dialing" ? (
                  <button className="pause-button" disabled>
                    <Phone size={16} /> Dialing…
                  </button>
                ) : (
                  <button
                    className="pause-button"
                    onClick={() => setPaused(!paused)}
                  >
                    <Clock3 size={16} /> {paused ? "Resume" : "Pause"}
                  </button>
                )}
              </div>
            </section>
            <div
              className={`work-grid call-workspace ${callState === "ready" || callState === "dialing" ? "ready-workspace" : ""}`}
            >
              <aside className="lead-context">
                {callState === "ready" || callState === "dialing" ? (
                  <>
                    <div className="campaign-list-title">
                      <span>Active campaign</span>
                      <strong>
                        {dialerWorkspace?.activeCampaign?.name ||
                          "Choose a campaign"}
                      </strong>
                      <small>
                        {dialerWorkspace?.activeLeadList?.name ||
                          "Choose a lead list"}{" "}
                        · {leads.length} queued leads
                      </small>
                    </div>
                    <div className="lead-section lead-list-only">
                      {leads.length ? (
                        leads.map((item, index) => (
                          <button
                            key={item._id}
                            className={`vertical-lead ${queueIndex === index ? "active" : ""}`}
                            onClick={() => setSelectedLead(index)}
                          >
                            <span>{item.initials}</span>
                            <div>
                              <b>{item.name}</b>
                              <small>
                                {item.company} · {item.role}
                              </small>
                            </div>
                            {queueIndex === index && <em>Now</em>}
                          </button>
                        ))
                      ) : (
                        <p className="queue-empty">
                          Choose a campaign and one of its lead lists, then
                          return here to dial.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="lead-profile">
                      <span className="avatar avatar-large">
                        {lead.initials}
                      </span>
                      <div>
                        <h2>{lead.name}</h2>
                        <p>{lead.role}</p>
                        <a>{lead.company}</a>
                      </div>
                    </div>
                    <div className="lead-phone">
                      <Phone size={15} /> {lead.phone}
                    </div>
                    <div className="lead-event">
                      <strong>Call trigger event</strong>
                      <p>
                        {dialerWorkspace?.activeOffer?.description ||
                          "Use the campaign offer and playbook to guide this conversation."}
                      </p>
                    </div>
                    <div className="lead-section intelligence">
                      <h3>Company intelligence</h3>
                      <div className="intel-grid">
                        <span>
                          <small>Company</small>
                          <b>{lead.company}</b>
                        </span>
                        <span>
                          <small>List</small>
                          <b>{queueLead?.listName || "Campaign"}</b>
                        </span>
                      </div>
                      {(queueLead?.website || queueLead?.googleMapsUrl) && (
                        <div className="research-actions">
                          {queueLead.website && (
                            <button
                              onClick={() =>
                                void openResearchLink(queueLead.website!)
                              }
                            >
                              Website
                            </button>
                          )}
                          {queueLead.googleMapsUrl && (
                            <button
                              onClick={() =>
                                void openResearchLink(queueLead.googleMapsUrl!)
                              }
                            >
                              Maps
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="lead-section">
                      <h3>Account notes</h3>
                      <p className="account-note">
                        Details from this lead list will stay visible while you
                        work the call.
                      </p>
                    </div>
                  </>
                )}
              </aside>
              <section className="conversation-card">
                {callState === "ready" || callState === "dialing" ? (
                  <>
                    <div className="card-head">
                      <div>
                        <h2>Live conversation</h2>
                        <p>
                          {callState === "dialing"
                            ? `Calling ${lead.name} · waiting for an answer`
                            : "Ready to start · transcription begins when connected"}
                        </p>
                      </div>
                      <span className="live-pill ready">
                        {callState === "dialing" ? "Dialing" : "Ready to dial"}
                      </span>
                    </div>
                    <div className="conversation-tabs">
                      {["Conversation", "Notes", "Activity"].map((tab) => (
                        <button
                          key={tab}
                          className={activeTab === tab ? "selected" : ""}
                          onClick={() => setActiveTab(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    <div className="precall-stream">
                      <Phone size={22} />
                      <strong>
                        {callState === "dialing"
                          ? "Waiting for the lead to answer"
                          : "Live speech stream is ready"}
                      </strong>
                      <span>
                        {callState === "dialing"
                          ? "Lead details open only after the call is answered."
                          : "Start the call to capture the conversation and surface real-time guidance."}
                      </span>
                      {callError && (
                        <small className="call-error">{callError}</small>
                      )}
                    </div>
                    <div className="conversation-footer">
                      Current lead: {lead.name} · {lead.company}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="card-head">
                      <div>
                        <h2>Live conversation</h2>
                        <p>
                          {callState === "calling"
                            ? "Call in progress · 04:38"
                            : "Call completed"}
                        </p>
                      </div>
                      <span className={`live-pill ${callState}`}>
                        {callState === "calling" && (
                          <span className="pulse-dot" />
                        )}
                        {callState === "calling" ? "Live" : "Completed"}
                      </span>
                    </div>
                    <div className="conversation-tabs">
                      {["Conversation", "Notes", "Activity"].map((tab) => (
                        <button
                          key={tab}
                          className={activeTab === tab ? "selected" : ""}
                          onClick={() => setActiveTab(tab)}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                    {activeTab === "Conversation" ? (
                      <>
                        <div className="transcript" aria-live="polite">
                          <div className="transcript-line">
                            <time>00:42</time>
                            <div>
                              <span className="speaker-label">You</span>
                              <p>
                                Hi Amelia, this is Jamie from Icary. Did I catch
                                you with a couple of minutes?
                              </p>
                            </div>
                          </div>
                          <div className="transcript-line">
                            <time>00:51</time>
                            <div>
                              <span className="speaker-label customer">
                                Amelia
                              </span>
                              <p>
                                Yes, I have a few. We’re actually looking at
                                ways to make our outbound process less manual
                                this quarter.
                              </p>
                            </div>
                          </div>
                          <div className="transcript-line">
                            <time>01:09</time>
                            <div>
                              <span className="speaker-label">You</span>
                              <p>
                                That’s helpful context. What’s creating the most
                                friction for the team today?
                              </p>
                            </div>
                          </div>
                          <div className="transcript-line current">
                            <time>01:22</time>
                            <div>
                              <span className="speaker-label customer">
                                Amelia
                              </span>
                              <p>
                                Mostly context switching. Reps are moving
                                between the dialer, notes, and our CRM after
                                every call…
                              </p>
                              <span className="typing-cursor" />
                            </div>
                          </div>
                        </div>
                        <div className="conversation-footer">
                          Live transcription is captured automatically for this
                          call.
                        </div>
                      </>
                    ) : (
                      <div className="tab-placeholder">
                        <FileText size={25} />
                        <strong>{activeTab} is ready when you need it</strong>
                        <span>
                          Keep the call in focus while you capture the next
                          meaningful detail.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </section>

              {assistantVisible && (
                <aside className="assist-panel">
                  <div className="assist-title">
                    <span className="assist-icon">
                      <Bot size={16} />
                    </span>
                    <div>
                      <h2>Conversation assistant</h2>
                      <p>Listening for useful context</p>
                    </div>
                    <button
                      aria-label="Close assistant"
                      onClick={() => setAssistantVisible(false)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                  <div className="insight-block">
                    <span className="insight-label">Live insight</span>
                    <p>
                      Amelia mentioned <strong>context switching</strong> and a{" "}
                      <strong>Q3 evaluation</strong>.
                    </p>
                    <button className="link-button" onClick={addInsightToNotes}>
                      Add to notes <Plus size={14} />
                    </button>
                  </div>
                  <div className="assist-section">
                    <h3>Suggested follow-up</h3>
                    <p className="assist-copy">
                      Ask how their team currently records call outcomes and
                      prepares for the next touchpoint.
                    </p>
                    <button
                      className="ask-button"
                      onClick={() => setAssistantPrompt(!assistantPrompt)}
                    >
                      <Bot size={16} />{" "}
                      {assistantPrompt
                        ? "Question added below"
                        : "Explore this question"}
                    </button>
                    {assistantPrompt && (
                      <p className="assistant-response">
                        Try: “What does your team do between a finished call and
                        the next outreach?”
                      </p>
                    )}
                  </div>
                  <div className="assist-section">
                    <h3>Relevant context</h3>
                    <div className="context-item">
                      <div className="context-symbol">
                        <Users size={16} />
                      </div>
                      <div>
                        <strong>18-person SDR team</strong>
                        <span>Imported from account notes</span>
                      </div>
                    </div>
                    <div className="context-item">
                      <div className="context-symbol">
                        <CalendarDays size={16} />
                      </div>
                      <div>
                        <strong>Evaluating in Q3</strong>
                        <span>Added on last conversation</span>
                      </div>
                    </div>
                  </div>
                  <div className="privacy-note">
                    <Bot size={14} /> AI suggestions are based on this
                    conversation and account context.
                  </div>
                </aside>
              )}
            </div>

            <section className="bottom-grid">
              <div className="notes-card">
                <div className="card-head compact">
                  <div>
                    <h2>Call notes</h2>
                    <p>Visible to your team</p>
                  </div>
                  {saved && <span className="saved">Saved</span>}
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Capture the key details, objections, and agreed next steps…"
                  maxLength={500}
                />
                <div className="notes-footer">
                  <span>{remaining}/500</span>
                  <button
                    className="primary-button"
                    disabled={!notes.trim()}
                    onClick={() => setSaved(true)}
                  >
                    Save notes
                  </button>
                </div>
              </div>
              <div
                className={`next-card ${callState === "complete" ? "outcome-modal" : ""}`}
              >
                {callState === "complete" ? (
                  <div className="wrapup-modal-content">
                    <div>
                      <h2>Wrap up {lead.name}’s call</h2>
                      <p>Everything important, in one final review.</p>
                    </div>
                    <div className="wrapup-status">
                      <span>Meeting</span>
                      <strong>{meetingBooked ? "Booked" : "Not booked"}</strong>
                      <span>Criteria</span>
                      <strong>
                        {bookingChecks.filter(Boolean).length}/
                        {bookingCriteria.length || 0} checked
                      </strong>
                      <span>Email</span>
                      <strong>
                        {draftCreated ? "Draft ready" : "No draft"}
                      </strong>
                    </div>
                    <div className="outcomes">
                      <button
                        className={
                          outcomeDraft === "Interested"
                            ? "selected-outcome"
                            : ""
                        }
                        onClick={() => setOutcomeDraft("Interested")}
                      >
                        <span className="outcome-icon success">
                          <UserRound size={17} />
                        </span>
                        <span>
                          <strong>Interested</strong>
                          <small>Continue opportunity</small>
                        </span>
                      </button>
                      <button
                        className={
                          outcomeDraft === "Follow up" ? "selected-outcome" : ""
                        }
                        onClick={() => setOutcomeDraft("Follow up")}
                      >
                        <span className="outcome-icon neutral">
                          <CalendarDays size={17} />
                        </span>
                        <span>
                          <strong>Follow up</strong>
                          <small>Set a later touch</small>
                        </span>
                      </button>
                      <button
                        className={
                          outcomeDraft === "Do not call"
                            ? "selected-outcome"
                            : ""
                        }
                        onClick={() => setOutcomeDraft("Do not call")}
                      >
                        <span className="outcome-icon muted">
                          <ChevronLeft size={17} />
                        </span>
                        <span>
                          <strong>Do not call</strong>
                          <small>Remove from queue</small>
                        </span>
                      </button>
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        setSaved(false);
                      }}
                      placeholder="Add final notes for the account executive…"
                      maxLength={500}
                    />
                    <div className="wrapup-footer">
                      <span>{notes.length}/500</span>
                      <div className="wrapup-actions">
                        <button
                          className="secondary-button"
                          disabled={!outcomeDraft}
                          onClick={saveAndPause}
                        >
                          Save
                        </button>
                        <button
                          className="primary-button"
                          disabled={!outcomeDraft}
                          onClick={saveWrapUp}
                        >
                          Save & call next
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="call-pending">
                    <Phone size={18} />
                    <div>
                      <h2>Finish the call to record an outcome</h2>
                      <p>
                        Outcomes and follow-ups appear here once the
                        conversation ends.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
            {callState === "calling" && (
              <>
                <div className="call-action-drawer">
                  {bookingOpen && (
                    <div className="action-drawer-content booking-drawer">
                      {bookingCalendarOpen ? (
                        <>
                          <div>
                            <h3>
                              Book with{" "}
                              {bookingProvider === "calendly"
                                ? "Calendly"
                                : "Cal.com"}
                            </h3>
                            <p>
                              Choose a time, then mark the meeting booked before
                              ending this call.
                            </p>
                          </div>
                          {bookingUrl ? (
                            <iframe
                              title="Booking calendar"
                              src={bookingUrl}
                            />
                          ) : (
                            <p className="settings-error">
                              Add a Cal.com or Calendly booking link in this
                              campaign’s linked Product first.
                            </p>
                          )}
                          <div className="calendar-actions">
                            <button
                              className="secondary-button"
                              onClick={() => setBookingCalendarOpen(false)}
                            >
                              Back to criteria
                            </button>
                            <button
                              className="primary-button"
                              disabled={!bookingUrl}
                              onClick={() => {
                                setMeetingBooked(true);
                                setOutcomeDraft("Interested");
                                setBookingOpen(false);
                                setBookingCalendarOpen(false);
                              }}
                            >
                              Meeting booked
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <h3>Qualify before booking</h3>
                            <p>
                              {activeSellingEntity?.name ||
                                "Campaign product"}{" "}
                              · required criteria
                            </p>
                            {bookingCriteria.length ? (
                              bookingCriteria.map((criterion, index) => (
                                <label key={`${criterion.label}-${index}`}>
                                  <input
                                    type="checkbox"
                                    checked={bookingChecks[index] || false}
                                    onChange={() =>
                                      setBookingChecks((checks) =>
                                        checks.map((checked, itemIndex) =>
                                          itemIndex === index
                                            ? !checked
                                            : checked,
                                        ),
                                      )
                                    }
                                  />{" "}
                                  <span>
                                    <strong>{criterion.label}</strong>
                                    {criterion.guidance && (
                                      <small>{criterion.guidance}</small>
                                    )}
                                  </span>
                                </label>
                              ))
                            ) : (
                              <p className="empty-copy">
                                Set a qualification checklist in the linked
                                Product before booking.
                              </p>
                            )}
                          </div>
                          <div className="calendar-actions">
                            <button
                              className="secondary-button"
                              onClick={() => {
                                setOutcomeDraft("Interested");
                                setBookingOpen(false);
                              }}
                            >
                              Interested, not booking
                            </button>
                            <button
                              className="primary-button"
                              disabled={
                                !bookingCriteria.length ||
                                !bookingCriteria.every(
                                  (criterion, index) =>
                                    !criterion.required || bookingChecks[index],
                                ) ||
                                !bookingUrl
                              }
                              onClick={() => setBookingCalendarOpen(true)}
                            >
                              Continue to calendar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {emailOpen && (
                    <div className="action-drawer-content email-drawer">
                      <div>
                        <h3>
                          {draftCreated ? "Draft created" : "Follow-up email"}
                        </h3>
                        <p>
                          {draftCreated
                            ? "Saved to Amelia’s timeline."
                            : "Pre-filled from this conversation"}
                        </p>
                      </div>
                      <input
                        value={`Recap for ${lead.company}`}
                        readOnly
                        aria-label="Email subject"
                      />
                      <button
                        className="primary-button"
                        onClick={() => setDraftCreated(true)}
                      >
                        {draftCreated ? "Saved" : "Create draft"}
                      </button>
                    </div>
                  )}
                  {dialPadOpen && (
                    <div className="dialpad">
                      <output>{dialedDigits || "Enter digits"}</output>
                      {[
                        "1",
                        "2 ABC",
                        "3 DEF",
                        "4 GHI",
                        "5 JKL",
                        "6 MNO",
                        "7 PQRS",
                        "8 TUV",
                        "9 WXYZ",
                        "*",
                        "0 +",
                        "#",
                      ].map((digit) => (
                        <button key={digit} onClick={() => sendDtmf(digit)}>
                          {digit}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <nav className="call-action-bar" aria-label="In-call actions">
                  <button
                    onClick={() => setEmailOpen(!emailOpen)}
                    className={emailOpen ? "active-action" : ""}
                  >
                    <MailPlus size={18} />
                    <span>Email</span>
                  </button>
                  <button
                    onClick={() => setAddedToList(!addedToList)}
                    className={addedToList ? "active-action" : ""}
                  >
                    <ListPlus size={18} />
                    <span>{addedToList ? "Added" : "Add to list"}</span>
                  </button>
                  <button
                    onClick={() => {
                      setBookingOpen((open) => !open);
                      setBookingCalendarOpen(false);
                    }}
                    className={bookingOpen ? "active-action" : ""}
                  >
                    <CalendarDays size={18} />
                    <span>{meetingBooked ? "Booked" : "Book meeting"}</span>
                  </button>
                  <button
                    onClick={toggleMute}
                    className={muted ? "active-action" : ""}
                  >
                    <MicOff size={18} />
                    <span>{muted ? "Unmute" : "Mute"}</span>
                  </button>
                  <button
                    onClick={() => setDialPadOpen(!dialPadOpen)}
                    className={dialPadOpen ? "active-action" : ""}
                  >
                    <KeyRound size={18} />
                    <span>Dial pad</span>
                  </button>
                  <button
                    onClick={() => setAssistantVisible(!assistantVisible)}
                  >
                    <MoreHorizontal size={20} />
                    <span>{assistantVisible ? "Hide AI" : "Show AI"}</span>
                  </button>
                  <button className="end-call-bar" onClick={endCall}>
                    <Phone size={18} />
                    <span>End call</span>
                  </button>
                </nav>
              </>
            )}
          </>
        )}

      </main>
      <audio ref={remoteAudio} autoPlay />
    </div>
  );
}

export default App;

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <AuthGate>
      {({ initialSipProfile }) => <App initialSipProfile={initialSipProfile} />}
    </AuthGate>
  </ConvexAuthProvider>,
);
