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
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  Clock3,
  FileText,
  Home,
  KeyRound,
  LayoutList,
  ListPlus,
  Mail,
  MailPlus,
  MicOff,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings,
  Trash2,
  UserRound,
  Users,
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
  const updateProfile = useMutation(api.organizations.updateProfile);
  const importLeadCsv = useMutation(api.leadLists.importCsv);
  const createOffer = useMutation(api.campaigns.createOffer);
  const createPlaybook = useMutation(api.campaigns.createPlaybook);
  const createCampaign = useMutation(api.campaigns.createCampaign);
  const setActiveCampaign = useMutation(api.dialer.setActiveCampaign);
  const recordCallOutcome = useMutation(api.dialer.recordOutcome);
  const saveCampaignOffer = useMutation(api.campaigns.saveCampaignOffer);
  const saveCampaignPlaybook = useMutation(api.campaigns.saveCampaignPlaybook);
  const setCampaignLeadLists = useMutation(api.campaigns.setCampaignLeadLists);
  const renameCampaign = useMutation(api.campaigns.renameCampaign);
  const deleteCampaign = useMutation(api.campaigns.deleteCampaign);
  const deleteCampaignOffer = useMutation(api.campaigns.deleteCampaignOffer);
  const deleteCampaignPlaybook = useMutation(
    api.campaigns.deleteCampaignPlaybook,
  );
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
  const [campaignsExpanded, setCampaignsExpanded] = useState(true);
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
  const [campaignSearch, setCampaignSearch] = useState("");
  const [createCampaignOpen, setCreateCampaignOpen] = useState(false);
  const [newCampaignSetup, setNewCampaignSetup] = useState({
    name: "",
    offerName: "",
    description: "",
    tags: "",
    bookingProvider: "",
    bookingUrl: "",
    qualificationCriteria: "",
    playbookName: "",
    playbookBody: "",
  });
  const [resourceError, setResourceError] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] =
    useState<Id<"campaigns"> | null>(null);
  const [pendingQueueLeadId, setPendingQueueLeadId] =
    useState<Id<"leads"> | null>(null);
  const [campaignSection, setCampaignSection] = useState<
    "Overview" | "Offer" | "Lead lists" | "Playbook"
  >("Overview");
  const campaignDetail = useQuery(
    api.campaigns.campaignDetail,
    selectedCampaignId ? { campaignId: selectedCampaignId } : "skip",
  );
  const [campaignOfferDraft, setCampaignOfferDraft] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    idealCustomer: "",
    bookingProvider: "",
    bookingUrl: "",
    qualificationCriteria: [{ label: "", guidance: "", required: true }],
  });
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
  const bookingCriteria =
    dialerWorkspace?.activeOffer?.qualificationCriteria || [];
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
      if (campaignId) setCampaignSection("Lead lists");
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
      if (newCampaignSetup.offerName.trim())
        await saveCampaignOffer({
          campaignId,
          name: newCampaignSetup.offerName,
          description: newCampaignSetup.description,
          tags: newCampaignSetup.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          idealCustomer: "",
          bookingProvider:
            newCampaignSetup.bookingProvider === "calcom" ||
            newCampaignSetup.bookingProvider === "calendly"
              ? newCampaignSetup.bookingProvider
              : undefined,
          bookingUrl: newCampaignSetup.bookingUrl,
          qualificationCriteria: newCampaignSetup.qualificationCriteria
            .split("\n")
            .map((label) => label.trim())
            .filter(Boolean)
            .map((label) => ({ label, required: true })),
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
        offerName: "",
        description: "",
        tags: "",
        bookingProvider: "",
        bookingUrl: "",
        qualificationCriteria: "",
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
    setCampaignOfferDraft({
      name: campaignDetail.offer?.name || "",
      description: campaignDetail.offer?.description || "",
      tags: campaignDetail.offer?.tags || [],
      idealCustomer: campaignDetail.offer?.idealCustomer || "",
      bookingProvider: campaignDetail.offer?.bookingProvider || "",
      bookingUrl: campaignDetail.offer?.bookingUrl || "",
      qualificationCriteria: campaignDetail.offer?.qualificationCriteria?.length
        ? campaignDetail.offer.qualificationCriteria.map((item) => ({
            ...item,
            guidance: item.guidance || "",
          }))
        : [{ label: "", guidance: "", required: true }],
    });
    setCampaignPlaybookDraft({
      name: campaignDetail.playbook?.name || "",
      body: campaignDetail.playbook?.body || "",
    });
    setCampaignNameDraft(campaignDetail.campaign.name);
  }, [
    campaignDetail?.campaign._id,
    campaignDetail?.offer?._id,
    campaignDetail?.playbook?._id,
  ]);
  useEffect(() => {
    setBookingChecks(bookingCriteria.map(() => false));
    setBookingCalendarOpen(false);
  }, [dialerWorkspace?.activeOffer?._id, bookingCriteria.length]);
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
    section: "Overview" | "Offer" | "Lead lists" | "Playbook" = "Overview",
  ) => {
    setSelectedCampaignId(campaignId);
    setCampaignSection(section);
    setActiveNav("Campaigns");
  };
  const dialCampaignLead = async (leadId: Id<"leads">) => {
    if (!selectedCampaignId) return;
    try {
      await startCampaign(selectedCampaignId);
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
  const startCampaign = async (campaignId: Id<"campaigns">) => {
    try {
      await setActiveCampaign({ campaignId });
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
  const saveOfferForCampaign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCampaignId) return;
    setResourceError("");
    try {
      await saveCampaignOffer({
        campaignId: selectedCampaignId,
        name: campaignOfferDraft.name,
        description: campaignOfferDraft.description,
        tags: campaignOfferDraft.tags,
        idealCustomer: campaignOfferDraft.idealCustomer,
        bookingProvider:
          campaignOfferDraft.bookingProvider === "calcom" ||
          campaignOfferDraft.bookingProvider === "calendly"
            ? campaignOfferDraft.bookingProvider
            : undefined,
        bookingUrl: campaignOfferDraft.bookingUrl,
        qualificationCriteria: campaignOfferDraft.qualificationCriteria,
      });
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not save this offer.",
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
  const toggleCampaignList = async (listId: Id<"leadLists">) => {
    if (!campaignDetail || !selectedCampaignId) return;
    const current = campaignDetail.campaign.leadListIds || [];
    const next = current.includes(listId)
      ? current.filter((id) => id !== listId)
      : [...current, listId];
    try {
      await setCampaignLeadLists({
        campaignId: selectedCampaignId,
        leadListIds: next,
      });
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not update this campaign.",
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
  const removeOffer = async () => {
    if (
      !selectedCampaignId ||
      !window.confirm("Delete this offer and its booking criteria?")
    )
      return;
    try {
      await deleteCampaignOffer({ campaignId: selectedCampaignId });
    } catch (error) {
      setResourceError(
        error instanceof Error
          ? error.message
          : "Icary could not delete this offer.",
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
          <div className="nav-section">
            <div className="nav-label">Workspace</div>
            <button
              className={`nav-item ${activeNav === "Home" ? "active" : ""}`}
              onClick={() => setActiveNav("Home")}
            >
              <Icon>
                <Home size={18} />
              </Icon>
              <span>Home</span>
            </button>
            <button
              className={`nav-item ${activeNav === "Dial" ? "active" : ""}`}
              onClick={() => setActiveNav("Dial")}
            >
              <Icon>
                <Phone size={18} />
              </Icon>
              <span>Dial</span>
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
                <CalendarDays size={18} />
              </Icon>
              <span>Goals</span>
              <small>soon</small>
            </button>
          </div>

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
              <span>Dashboard</span>
              <small>soon</small>
            </button>
            <button
              className={`nav-item nav-parent ${activeNav === "Campaigns" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("Campaigns");
                setCampaignsExpanded((expanded) => !expanded);
              }}
              aria-expanded={campaignsExpanded}
            >
              <Icon>
                <BookOpen size={18} />
              </Icon>
              <span>Campaigns</span>
              <ChevronDown
                size={15}
                className={campaignsExpanded ? "rotated" : ""}
              />
            </button>
            {campaignsExpanded && (
              <div className="nav-children campaign-nav-children">
                {campaignWorkspace?.campaigns.map((campaign) => (
                  <button
                    key={campaign._id}
                    className={`nav-item nav-child ${selectedCampaignId === campaign._id && activeNav === "Campaigns" ? "selected" : ""}`}
                    onClick={() => openCampaign(campaign._id)}
                    aria-current={
                      selectedCampaignId === campaign._id &&
                      activeNav === "Campaigns"
                        ? "page"
                        : undefined
                    }
                  >
                    <Icon>
                      <BookOpen size={15} />
                    </Icon>
                    <span>{campaign.name}</span>
                  </button>
                ))}
                <button
                  className="nav-item nav-child add-campaign-nav"
                  onClick={() => {
                    setSelectedCampaignId(null);
                    setActiveNav("Campaigns");
                  }}
                >
                  <Icon>
                    <Plus size={15} />
                  </Icon>
                  <span>Add campaign</span>
                </button>
              </div>
            )}
            <button
              className="nav-item coming-nav"
              disabled
              title="Coming soon"
            >
              <Icon>
                <Users size={18} />
              </Icon>
              <span>Members</span>
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
            <span>Settings</span>
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
            <div className="portfolio-list">
              {myCampaigns.length ? (
                myCampaigns.map((campaign) => (
                  <article
                    key={campaign._id}
                    className={`campaign-row ${dialerWorkspace?.activeCampaign?._id === campaign._id ? "active-campaign" : ""}`}
                  >
                    <div>
                      <h2>{campaign.name}</h2>
                      <p>
                        {campaign.organizationName} · {campaign.leadCount}{" "}
                        callable leads ·{" "}
                        {campaign.status === "active"
                          ? "Active"
                          : "Ready to set up"}
                      </p>
                    </div>
                    <div className="campaign-row-actions">
                      <button
                        className="secondary-button"
                        onClick={() => openCampaign(campaign._id)}
                      >
                        Open
                      </button>
                      <button
                        className="secondary-button destructive-button"
                        onClick={() =>
                          void removeFromMyCampaigns({
                            campaignId: campaign._id,
                          })
                        }
                      >
                        Remove
                      </button>
                      <button
                        className="primary-button"
                        disabled={!campaign.leadCount}
                        onClick={() => void startCampaign(campaign._id)}
                      >
                        {dialerWorkspace?.activeCampaign?._id === campaign._id
                          ? "Resume"
                          : "Work campaign"}
                      </button>
                    </div>
                  </article>
                ))
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
            </div>
            {resourceError && (
              <p className="settings-error" role="alert">
                {resourceError}
              </p>
            )}
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
                  <button
                    className="primary-button"
                    onClick={() => setCreateCampaignOpen(true)}
                  >
                    <Plus size={16} /> Add campaign
                  </button>
                </header>
                <label className="campaign-search">
                  <Search size={16} />
                  <input
                    value={campaignSearch}
                    onChange={(event) => setCampaignSearch(event.target.value)}
                    placeholder="Search campaigns"
                  />
                </label>
                <div className="campaign-index">
                  {campaignWorkspace?.campaigns
                    .filter(
                      (campaign) =>
                        campaign.name
                          .toLowerCase()
                          .includes(campaignSearch.trim().toLowerCase()) ||
                        campaignWorkspace.offers
                          .find((offer) => offer._id === campaign.offerId)
                          ?.tags?.some((tag) =>
                            tag
                              .toLowerCase()
                              .includes(campaignSearch.trim().toLowerCase()),
                          ),
                    )
                    .map((campaign) => {
                      const offer = campaignWorkspace.offers.find(
                        (item) => item._id === campaign.offerId,
                      );
                      const isActive =
                        dialerWorkspace?.activeCampaign?._id === campaign._id;
                      const isSaved = myCampaigns.some(
                        (item) => item._id === campaign._id,
                      );
                      return (
                        <article
                          className={`campaign-card ${isActive ? "active-campaign-card" : ""}`}
                          key={campaign._id}
                        >
                          <button
                            className="campaign-card-main"
                            onClick={() => openCampaign(campaign._id)}
                          >
                            <span className="campaign-card-title">
                              <strong>{campaign.name}</strong>
                              <small>
                                {campaign.status === "active"
                                  ? "Active campaign"
                                  : "Ready to set up"}
                              </small>
                            </span>
                            {offer?.tags?.length ? (
                              <span className="offer-tags">
                                {offer.tags.map((tag) => (
                                  <i className="offer-tag" key={tag}>
                                    {tag}
                                  </i>
                                ))}
                              </span>
                            ) : (
                              offer?.name && (
                                <span className="offer-tag">{offer.name}</span>
                              )
                            )}
                            <span className="campaign-card-stats">
                              <b>
                                <i>{(campaign.leadListIds || []).length}</i>{" "}
                                Lead lists
                              </b>
                              <b>
                                <i>{isActive ? "Current" : "Open"}</i> Workspace
                              </b>
                            </span>
                          </button>
                          <footer>
                            <button
                              className="text-button"
                              onClick={() => openCampaign(campaign._id)}
                            >
                              Open workspace <ChevronDown size={15} />
                            </button>
                            <button
                              className="secondary-button"
                              disabled={isSaved}
                              onClick={() =>
                                void addToMyCampaigns({
                                  campaignId: campaign._id,
                                })
                              }
                            >
                              {isSaved
                                ? "In My campaigns"
                                : "Add to My campaigns"}
                            </button>
                          </footer>
                        </article>
                      );
                    })}
                </div>
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
                        <h3>Offer</h3>
                        <label>
                          Offer name
                          <input
                            value={newCampaignSetup.offerName}
                            onChange={(event) =>
                              setNewCampaignSetup((current) => ({
                                ...current,
                                offerName: event.target.value,
                              }))
                            }
                            placeholder="Website design"
                          />
                        </label>
                        <label>
                          Tags
                          <input
                            value={newCampaignSetup.tags}
                            onChange={(event) =>
                              setNewCampaignSetup((current) => ({
                                ...current,
                                tags: event.target.value,
                              }))
                            }
                            placeholder="Website design, SEO"
                          />
                        </label>
                        <label>
                          What it solves
                          <textarea
                            value={newCampaignSetup.description}
                            onChange={(event) =>
                              setNewCampaignSetup((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder="The concise value proposition for the rep."
                          />
                        </label>
                        <div className="booking-fields">
                          <label>
                            Booking provider
                            <select
                              value={newCampaignSetup.bookingProvider}
                              onChange={(event) =>
                                setNewCampaignSetup((current) => ({
                                  ...current,
                                  bookingProvider: event.target.value,
                                }))
                              }
                            >
                              <option value="">Choose later</option>
                              <option value="calcom">Cal.com</option>
                              <option value="calendly">Calendly</option>
                            </select>
                          </label>
                          <label>
                            Booking link
                            <input
                              type="url"
                              value={newCampaignSetup.bookingUrl}
                              onChange={(event) =>
                                setNewCampaignSetup((current) => ({
                                  ...current,
                                  bookingUrl: event.target.value,
                                }))
                              }
                              placeholder="https://cal.com/..."
                            />
                          </label>
                        </div>
                        <label>
                          Qualified lead checklist
                          <textarea
                            value={newCampaignSetup.qualificationCriteria}
                            onChange={(event) =>
                              setNewCampaignSetup((current) => ({
                                ...current,
                                qualificationCriteria: event.target.value,
                              }))
                            }
                            placeholder={
                              "Decision maker\nBudget confirmed\nMeeting need identified"
                            }
                          />
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
                      <button
                        className="back-button"
                        onClick={() => setSelectedCampaignId(null)}
                      >
                        <ChevronLeft size={16} /> Campaigns
                      </button>
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
                          className="primary-button"
                          onClick={() =>
                            void startCampaign(campaignDetail.campaign._id)
                          }
                        >
                          <Phone size={15} /> Work campaign
                        </button>
                      </div>
                    </header>
                    <nav
                      className="campaign-tabs"
                      aria-label="Campaign sections"
                    >
                      {(
                        ["Overview", "Offer", "Lead lists", "Playbook"] as const
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
                      <>
                        <section className="campaign-workspace">
                          <header className="campaign-workspace-header">
                            <div>
                              <h2>Leads</h2>
                              <p>
                                {campaignDetail.leads.length} imported · select
                                a lead to open it in Dial
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
                                className="secondary-button"
                                onClick={() => setCampaignSection("Lead lists")}
                              >
                                Manage lists
                              </button>
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
                                          void dialCampaignLead(lead._id)
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
                      </>
                    )}
                    {campaignSection === "Offer" && (
                      <form
                        className="campaign-form-detail"
                        onSubmit={saveOfferForCampaign}
                      >
                        <label>
                          Offer name
                          <input
                            required
                            value={campaignOfferDraft.name}
                            onChange={(event) =>
                              setCampaignOfferDraft((current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                            placeholder="e.g. SMB website package"
                          />
                        </label>
                        <label>
                          What it solves
                          <textarea
                            value={campaignOfferDraft.description}
                            onChange={(event) =>
                              setCampaignOfferDraft((current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder="The concise promise the rep is calling about."
                          />
                        </label>
                        <label>
                          Tags
                          <input
                            value={campaignOfferDraft.tags.join(", ")}
                            onChange={(event) =>
                              setCampaignOfferDraft((current) => ({
                                ...current,
                                tags: event.target.value
                                  .split(",")
                                  .map((tag) => tag.trim())
                                  .filter(Boolean),
                              }))
                            }
                            placeholder="Website design, SEO, AI receptionist"
                          />
                        </label>
                        <label>
                          Ideal customer
                          <textarea
                            value={campaignOfferDraft.idealCustomer}
                            onChange={(event) =>
                              setCampaignOfferDraft((current) => ({
                                ...current,
                                idealCustomer: event.target.value,
                              }))
                            }
                            placeholder="Who this offer is for."
                          />
                        </label>
                        <div className="booking-fields">
                          <label>
                            Booking provider
                            <select
                              value={campaignOfferDraft.bookingProvider}
                              onChange={(event) =>
                                setCampaignOfferDraft((current) => ({
                                  ...current,
                                  bookingProvider: event.target.value,
                                }))
                              }
                            >
                              <option value="">Choose later</option>
                              <option value="calcom">Cal.com</option>
                              <option value="calendly">Calendly</option>
                            </select>
                          </label>
                          <label>
                            Booking link
                            <input
                              type="url"
                              value={campaignOfferDraft.bookingUrl}
                              onChange={(event) =>
                                setCampaignOfferDraft((current) => ({
                                  ...current,
                                  bookingUrl: event.target.value,
                                }))
                              }
                              placeholder="https://cal.com/your-team/meeting"
                            />
                          </label>
                        </div>
                        <div className="criteria-editor">
                          <div>
                            <h2>Qualified lead checklist</h2>
                            <p>
                              These appear before the calendar in a live call.
                            </p>
                          </div>
                          {campaignOfferDraft.qualificationCriteria.map(
                            (criterion, index) => (
                              <div className="criterion-row" key={index}>
                                <input
                                  value={criterion.label}
                                  onChange={(event) =>
                                    setCampaignOfferDraft((current) => ({
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
                                  placeholder="Qualification criterion"
                                />
                                <input
                                  value={criterion.guidance || ""}
                                  onChange={(event) =>
                                    setCampaignOfferDraft((current) => ({
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
                                  placeholder="Optional guidance"
                                />
                                <label>
                                  <input
                                    type="checkbox"
                                    checked={criterion.required}
                                    onChange={(event) =>
                                      setCampaignOfferDraft((current) => ({
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
                                  />{" "}
                                  Required
                                </label>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCampaignOfferDraft((current) => ({
                                      ...current,
                                      qualificationCriteria:
                                        current.qualificationCriteria.filter(
                                          (_, itemIndex) => itemIndex !== index,
                                        ),
                                    }))
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            ),
                          )}
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              setCampaignOfferDraft((current) => ({
                                ...current,
                                qualificationCriteria: [
                                  ...current.qualificationCriteria,
                                  { label: "", guidance: "", required: true },
                                ],
                              }))
                            }
                          >
                            Add criterion
                          </button>
                        </div>
                        <div className="form-actions">
                          <button className="primary-button">Save offer</button>
                          {campaignDetail.offer && (
                            <button
                              type="button"
                              className="secondary-button destructive-button"
                              onClick={() => void removeOffer()}
                            >
                              Delete offer
                            </button>
                          )}
                        </div>
                      </form>
                    )}
                    {campaignSection === "Lead lists" && (
                      <section className="campaign-lists">
                        <header>
                          <div>
                            <h2>Lead lists</h2>
                            <p>
                              CSVs imported here belong to this campaign only.
                            </p>
                          </div>
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
                        ) : campaignDetail.leadLists.length ? (
                          campaignDetail.leadLists.map((list) => (
                            <div className="campaign-owned-list" key={list._id}>
                              <span>
                                <strong>{list.name}</strong>
                                <small>
                                  {list.leadCount} leads · This campaign only
                                </small>
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="empty-copy">
                            Import a CSV to create this campaign’s first lead
                            list.
                          </p>
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
          <section className="lead-lists-page">
            <header className="lead-lists-header">
              <div>
                <h1>Lead lists</h1>
                <p>
                  Campaign-owned lists are organized here. Import new leads from
                  the campaign that will call them.
                </p>
              </div>
              <button
                className="secondary-button"
                onClick={() => setActiveNav("Campaigns")}
              >
                Open a campaign to import
              </button>
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
            ) : (
              <div
                className="lead-list-table"
                role="table"
                aria-label="Lead lists"
              >
                <div className="lead-list-table-head" role="row">
                  <span role="columnheader">List</span>
                  <span role="columnheader">Source</span>
                  <span role="columnheader">Leads</span>
                  <span role="columnheader">Updated</span>
                  <span role="columnheader">Actions</span>
                </div>
                {leadLists.length ? (
                  leadLists.map((list) => (
                    <div
                      key={list._id}
                      className="lead-list-table-row"
                      role="row"
                    >
                      <span role="cell">
                        {editingLeadListId === list._id ? (
                          <input
                            aria-label="Lead list name"
                            value={leadListNameDraft}
                            onChange={(event) =>
                              setLeadListNameDraft(event.target.value)
                            }
                          />
                        ) : (
                          <strong>{list.name}</strong>
                        )}
                      </span>
                      <span role="cell">CSV</span>
                      <span role="cell">{list.leadCount}</span>
                      <span role="cell">
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                        }).format(list.updatedAt)}
                      </span>
                      <span className="table-actions" role="cell">
                        {editingLeadListId === list._id ? (
                          <>
                            <button
                              className="secondary-button"
                              onClick={() => void saveLeadListName()}
                            >
                              Save
                            </button>
                            <button
                              className="text-button"
                              onClick={() => setEditingLeadListId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="secondary-button"
                              onClick={() => {
                                setEditingLeadListId(list._id);
                                setLeadListNameDraft(list.name);
                              }}
                            >
                              Rename
                            </button>
                            <button
                              className="secondary-button destructive-button"
                              onClick={() =>
                                void deleteLeadList(list._id, list.name)
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="lead-lists-empty">
                    <FileText size={22} />
                    <strong>Import your first lead list</strong>
                    <span>
                      Upload a CSV, map its columns, then import it into a new
                      lead list.
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="queue-bar">
              <div className="queue-heading">
                <span className="status-dot" />{" "}
                <strong>
                  {dialerWorkspace?.activeCampaign?.name || "Choose a campaign"}
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
                      <small>{leads.length} queued leads</small>
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
                          Choose a campaign, attach a lead list, then return
                          here to dial.
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
                              {dialerWorkspace?.activeOffer?.bookingProvider ===
                              "calendly"
                                ? "Calendly"
                                : "Cal.com"}
                            </h3>
                            <p>
                              Choose a time, then mark the meeting booked before
                              ending this call.
                            </p>
                          </div>
                          {dialerWorkspace?.activeOffer?.bookingUrl ? (
                            <iframe
                              title="Booking calendar"
                              src={dialerWorkspace.activeOffer.bookingUrl}
                            />
                          ) : (
                            <p className="settings-error">
                              Add a Cal.com or Calendly booking link in this
                              campaign’s Offer first.
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
                              disabled={
                                !dialerWorkspace?.activeOffer?.bookingUrl
                              }
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
                              {dialerWorkspace?.activeOffer?.name ||
                                "Campaign offer"}{" "}
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
                                Set a qualification checklist in this campaign’s
                                Offer before booking.
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
                                !dialerWorkspace?.activeOffer?.bookingUrl
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
