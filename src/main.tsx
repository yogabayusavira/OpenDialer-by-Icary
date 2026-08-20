import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient, useMutation, useQuery } from 'convex/react'
import {
  BarChart3, Bell, BookOpen, Bot, CalendarDays, ChevronDown, ChevronLeft,
  CircleHelp, Clock3, FileText, Home, KeyRound, LayoutList, ListPlus, Mail, MailPlus, MicOff, MoreHorizontal, Phone,
  Plus, Search, Settings, UserRound, Users, X
} from 'lucide-react'
import './styles.css'
import { AuthGate } from './AuthGate'
import { SipClient, type SipConnectionStatus, type SipProfile } from './lib/sip'
import { api } from '../convex/_generated/api'
import type { Id } from '../convex/_generated/dataModel'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL)

const Icon = ({ children }: { children: ReactNode }) => <span className="nav-icon">{children}</span>

const leads = [
  { initials: 'AC', name: 'Amelia Chen', company: 'Velocity Works', role: 'VP Revenue Operations', phone: '+1 (415) 555-0148' },
  { initials: 'ND', name: 'Noah Diaz', company: 'Roam', role: 'Head of Sales', phone: '+1 (312) 555-0196' },
  { initials: 'PS', name: 'Priya Shah', company: 'Packet Labs', role: 'Sales Operations', phone: '+1 (646) 555-0118' },
  { initials: 'JL', name: 'Jordan Lee', company: 'Vanta', role: 'Revenue Enablement', phone: '+1 (206) 555-0183' },
  { initials: 'MR', name: 'Maria Ruiz', company: 'Alloy', role: 'VP Sales', phone: '+1 (917) 555-0134' },
]

const emptySipProfile: SipProfile = { webSocketServer: '', domain: '', username: '', password: '' }
const callingLines = [
  { id: 'sip-primary', number: '+1 (415) 890-2144', provider: 'SIP' },
]

type ImportedLead = { firstName?: string; lastName?: string; email?: string; phone?: string; company?: string; title?: string }
type CsvPreview = { fileName: string; headers: string[]; rows: string[][] }
type CsvMapping = Record<keyof ImportedLead, string>
const csvCells = (line: string) => {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === '"') { if (quoted && line[index + 1] === '"') { cell += '"'; index += 1 } else quoted = !quoted }
    else if (character === ',' && !quoted) { cells.push(cell.trim()); cell = '' }
    else cell += character
  }
  cells.push(cell.trim())
  return cells
}

function App({ initialSipProfile }: { initialSipProfile?: SipProfile }) {
  const account = useQuery(api.organizations.onboardingState)
  const leadLists = useQuery(api.leadLists.list) || []
  const campaignWorkspace = useQuery(api.campaigns.workspace)
  const updateProfile = useMutation(api.organizations.updateProfile)
  const importLeadCsv = useMutation(api.leadLists.importCsv)
  const createOffer = useMutation(api.campaigns.createOffer)
  const createPlaybook = useMutation(api.campaigns.createPlaybook)
  const createCampaign = useMutation(api.campaigns.createCampaign)
  const [notes, setNotes] = useState('')
  const [callState, setCallState] = useState<'ready' | 'dialing' | 'calling' | 'complete'>('ready')
  const [activeTab, setActiveTab] = useState('Conversation')
  const [saved, setSaved] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [outcomeDraft, setOutcomeDraft] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [assistantPrompt, setAssistantPrompt] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [dialPadOpen, setDialPadOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [addedToList, setAddedToList] = useState(false)
  const [selectedLead, setSelectedLead] = useState(0)
  const [activeNav, setActiveNav] = useState('Dial')
  const [campaignsExpanded, setCampaignsExpanded] = useState(true)
  const [organizationOpen, setOrganizationOpen] = useState(false)
  const [linePickerOpen, setLinePickerOpen] = useState(false)
  const [selectedLineId, setSelectedLineId] = useState(callingLines[0].id)
  const [paused, setPaused] = useState(false)
  const [assistantVisible, setAssistantVisible] = useState(true)
  const [bookingChecks, setBookingChecks] = useState([false, false, false])
  const [draftCreated, setDraftCreated] = useState(false)
  const [dialedDigits, setDialedDigits] = useState('')
  const [meetingBooked, setMeetingBooked] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [sipProfile, setSipProfile] = useState<SipProfile>(initialSipProfile || emptySipProfile)
  const [sipStatus, setSipStatus] = useState<SipConnectionStatus>('disconnected')
  const [settingsTab, setSettingsTab] = useState<'Profile' | 'Numbers' | 'Integrations'>('Numbers')
  const [sipBusy, setSipBusy] = useState(false)
  const [sipError, setSipError] = useState('')
  const [profileDraft, setProfileDraft] = useState({ displayName: '', title: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvImportMessage, setCsvImportMessage] = useState('')
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null)
  const [csvMapping, setCsvMapping] = useState<CsvMapping>({ firstName: '', lastName: '', email: '', phone: '', company: '', title: '' })
  const [offerDraft, setOfferDraft] = useState({ name: '', description: '' })
  const [playbookDraft, setPlaybookDraft] = useState({ name: '', body: '' })
  const [campaignDraft, setCampaignDraft] = useState({ name: '', offerId: '', playbookId: '', leadListIds: [] as string[] })
  const [resourceError, setResourceError] = useState('')
  const [callError, setCallError] = useState('')
  const sipClient = useRef(new SipClient()).current
  const remoteAudio = useRef<HTMLAudioElement>(null)
  const initialSipAttempted = useRef(false)
  const remaining = notes.length
  const lead = leads[selectedLead]
  const profileName = account?.profile.displayName || 'Jamie Morgan'
  const profileTitle = account?.profile.title || 'Sales representative'
  const profileImage = account?.profile.image || null
  const profileInitials = profileName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'OD'
  const organizationName = account?.organizationName || 'My workspace'
  const selectedLine = callingLines.find(line => line.id === selectedLineId) || callingLines[0]
  const openNumbersSettings = () => { setActiveNav('Settings'); setSettingsTab('Numbers') }

  useEffect(() => {
    if (!account) return
    setProfileDraft({ displayName: account.profile.displayName, title: account.profile.title })
  }, [account?.profile.displayName, account?.profile.title])

  const isSipConnected = sipStatus === 'registered'
  const startCall = async () => {
    setCallError('')
    if (!isSipConnected) { openNumbersSettings(); return }
    setCallState('dialing')
    try { await sipClient.call(lead.phone) }
    catch (error) {
      setCallState('ready')
      setCallError(error instanceof Error ? error.message : 'Icary could not start this call.')
    }
  }
  const endCall = async () => {
    try { await sipClient.hangup() } catch { /* Call might have already ended. */ }
    setCallState('complete')
  }
  const connectSipProfile = async (profile: SipProfile) => {
    if (!remoteAudio.current) return
    setSipBusy(true)
    setSipError('')
    try {
      await sipClient.connect(profile, remoteAudio.current, {
        onStatusChange: (status, message) => {
          setSipStatus(status)
          if (status === 'error') setSipError(message || 'Icary could not connect to this SIP account.')
        },
        onCallAnswered: () => setCallState('calling'),
        onCallEnded: () => setCallState(current => current === 'complete' ? current : 'complete'),
      })
    } catch {
      // The status callback contains the useful recovery message.
    } finally { setSipBusy(false) }
  }
  const connectSip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await connectSipProfile(sipProfile)
  }
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileSaving(true)
    setProfileError('')
    try { await updateProfile(profileDraft) }
    catch (error) { setProfileError(error instanceof Error ? error.message : 'Icary could not save your profile.') }
    finally { setProfileSaving(false) }
  }
  const selectCsv = async (file: File | undefined) => {
    if (!file) return
    setCsvImportMessage('')
    try {
      const rows = (await file.text()).split(/\r?\n/).filter(row => row.trim()).map(csvCells)
      if (rows.length < 2) throw new Error('Choose a CSV with a header row and at least one lead.')
      setCsvPreview({ fileName: file.name, headers: rows[0], rows: rows.slice(1) })
      setCsvMapping({ firstName: '', lastName: '', email: '', phone: '', company: '', title: '' })
    } catch (error) { setCsvImportMessage(error instanceof Error ? error.message : 'Icary could not read that CSV.') }
  }
  const importMappedCsv = async () => {
    if (!csvPreview) return
    const mappedColumns = Object.values(csvMapping).filter(Boolean)
    if (!mappedColumns.length) { setCsvImportMessage('Map at least one column before importing.'); return }
    setCsvImporting(true)
    setCsvImportMessage('')
    try {
      const column = (row: string[], field: keyof ImportedLead) => { const index = csvPreview.headers.indexOf(csvMapping[field]); return index >= 0 ? row[index]?.trim() || undefined : undefined }
      const imported = csvPreview.rows.map(row => ({ firstName: column(row, 'firstName'), lastName: column(row, 'lastName'), email: column(row, 'email'), phone: column(row, 'phone'), company: column(row, 'company'), title: column(row, 'title') })).filter(lead => lead.firstName || lead.lastName || lead.email || lead.phone)
      await importLeadCsv({ name: csvPreview.fileName.replace(/\.csv$/i, '') || 'Imported leads', leads: imported })
      setCsvImportMessage(`${imported.length} leads imported.`)
      setCsvPreview(null)
    } catch (error) { setCsvImportMessage(error instanceof Error ? error.message : 'Icary could not import that CSV.') }
    finally { setCsvImporting(false) }
  }
  const saveOffer = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setResourceError(''); try { await createOffer(offerDraft); setOfferDraft({ name: '', description: '' }) } catch (error) { setResourceError(error instanceof Error ? error.message : 'Icary could not save this offer.') } }
  const savePlaybook = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setResourceError(''); try { await createPlaybook(playbookDraft); setPlaybookDraft({ name: '', body: '' }) } catch (error) { setResourceError(error instanceof Error ? error.message : 'Icary could not save this playbook.') } }
  const saveCampaign = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setResourceError(''); try { await createCampaign({ name: campaignDraft.name, offerId: campaignDraft.offerId ? campaignDraft.offerId as Id<'offers'> : undefined, playbookId: campaignDraft.playbookId ? campaignDraft.playbookId as Id<'playbooks'> : undefined, leadListIds: campaignDraft.leadListIds as Id<'leadLists'>[] }); setCampaignDraft({ name: '', offerId: '', playbookId: '', leadListIds: [] }) } catch (error) { setResourceError(error instanceof Error ? error.message : 'Icary could not save this campaign.') } }
  useEffect(() => {
    if (!initialSipProfile || initialSipAttempted.current || !remoteAudio.current) return
    initialSipAttempted.current = true
    void connectSipProfile(initialSipProfile)
  }, [initialSipProfile])
  const updateSipProfile = (field: keyof SipProfile, value: string) => setSipProfile(current => ({ ...current, [field]: value }))
  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (next) sipClient.mute()
    else sipClient.unmute()
  }
  const sendDtmf = async (digit: string) => {
    const tone = digit[0]
    setDialedDigits(current => `${current}${tone}`)
    try { await sipClient.sendDtmf(tone) } catch { setCallError('The SIP server did not accept that dial-pad tone.') }
  }
  const advance = () => { setSelectedLead((selectedLead + 1) % leads.length); setCallState('calling'); setOutcome('') }
  const chooseOutcome = (choice: string) => { setOutcome(choice); setCallState('ready') }
  const saveOutcome = () => {
    const detail = outcomeDraft === 'Follow up' ? `Follow up — ${followUp || 'date scheduled'}` : `Interested — ${followUp || 'next step saved'}`
    chooseOutcome(detail)
    setOutcomeDraft('')
    setFollowUp('')
  }
  const saveWrapUp = () => {
    setOutcome(outcomeDraft)
    setSelectedLead((selectedLead + 1) % leads.length)
    setCallState('calling')
    setOutcomeDraft('')
    setFollowUp('')
    setMeetingBooked(false)
  }
  const saveAndPause = () => {
    setOutcome(outcomeDraft)
    setCallState('ready')
    setOutcomeDraft('')
    setFollowUp('')
    setMeetingBooked(false)
  }
  const addInsightToNotes = () => {
    const insight = 'Amelia is evaluating ways to reduce context switching ahead of a Q3 evaluation.'
    setNotes(current => current.includes(insight) ? current : `${current}${current ? '\n' : ''}${insight}`)
    setSaved(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="shell-brand"><div className="brand-mark">i</div><span className="brand-lockup"><span className="brand-name">OpenDialer</span><span className="brand-attribution">by icary</span></span></div>
        <label className="global-search"><Search size={16} /><input value={globalSearch} onChange={event => setGlobalSearch(event.target.value)} placeholder="Search leads, campaigns, or contacts" aria-label="Search leads, campaigns, or contacts" /></label>
        <div className="topbar-actions"><button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><i /></button><button className="help-button"><CircleHelp size={17} /> Help</button></div>
      </header>
      <aside className="sidebar" aria-label="Primary navigation">
        <nav>
          <div className="line-selector">
            <button className="line-selector-trigger" onClick={() => setLinePickerOpen(open => !open)} aria-haspopup="menu" aria-expanded={linePickerOpen}>
              <Phone size={16} /><span>{selectedLine.number}</span><small>{selectedLine.provider}</small><ChevronDown size={15} className={linePickerOpen ? 'rotated' : ''} />
            </button>
            {linePickerOpen && <div className="line-picker-menu" role="menu" aria-label="Choose outbound line">
              {callingLines.map(line => <button key={line.id} className={line.id === selectedLineId ? 'selected' : ''} role="menuitem" onClick={() => { setSelectedLineId(line.id); setLinePickerOpen(false) }}><span>{line.number}</span><small>{line.provider}</small></button>)}
              <div className="line-picker-divider" />
              <button className="add-number-button" role="menuitem" onClick={() => { setLinePickerOpen(false); openNumbersSettings() }}><Plus size={15} /><span>Add a number</span></button>
            </div>}
          </div>
          <div className="nav-section">
            <div className="nav-label">Workspace</div>
            <button className={`nav-item ${activeNav === 'Home' ? 'active' : ''}`} onClick={() => setActiveNav('Home')}><Icon><Home size={18} /></Icon><span>Home</span></button>
            <button className={`nav-item ${activeNav === 'Dial' ? 'active' : ''}`} onClick={() => setActiveNav('Dial')}><Icon><Phone size={18} /></Icon><span>Dial</span></button>
            <button className={`nav-item ${activeNav === 'My campaigns' ? 'active' : ''}`} onClick={() => setActiveNav('My campaigns')}><Icon><BookOpen size={18} /></Icon><span>My campaigns</span></button>
            <button className="nav-item coming-nav" disabled title="Coming soon"><Icon><CalendarDays size={18} /></Icon><span>Goals</span><small>soon</small></button>
          </div>

          <div className="nav-section organization-section">
            <div className="organization-switcher">
              <button onClick={() => setOrganizationOpen(open => !open)} aria-haspopup="menu" aria-expanded={organizationOpen}><span>{organizationName}</span><ChevronDown size={15} className={organizationOpen ? 'rotated' : ''} /></button>
              {organizationOpen && <div className="organization-menu" role="menu"><button className="selected" role="menuitem" onClick={() => setOrganizationOpen(false)}>{organizationName}</button><button disabled role="menuitem">More organizations soon</button></div>}
            </div>
            <button className="nav-item coming-nav" disabled title="Coming soon"><Icon><BarChart3 size={18} /></Icon><span>Dashboard</span><small>soon</small></button>
            <button className={`nav-item nav-parent ${activeNav === 'Campaigns' ? 'active' : ''}`} onClick={() => { setActiveNav('Campaigns'); setCampaignsExpanded(expanded => !expanded) }} aria-expanded={campaignsExpanded}><Icon><BookOpen size={18} /></Icon><span>Campaigns</span><ChevronDown size={15} className={campaignsExpanded ? 'rotated' : ''} /></button>
            {campaignsExpanded && <div className="nav-children">
              <button className={`nav-item nav-child ${activeNav === 'Offers' ? 'active' : ''}`} onClick={() => setActiveNav('Offers')}><Icon><FileText size={16} /></Icon><span>Offers</span></button>
              <button className={`nav-item nav-child ${activeNav === 'Lead lists' ? 'active' : ''}`} onClick={() => setActiveNav('Lead lists')}><Icon><LayoutList size={16} /></Icon><span>Lead lists</span></button>
              <button className={`nav-item nav-child ${activeNav === 'Playbooks' ? 'active' : ''}`} onClick={() => setActiveNav('Playbooks')}><Icon><BookOpen size={16} /></Icon><span>Playbooks</span></button>
            </div>}
            <button className="nav-item coming-nav" disabled title="Coming soon"><Icon><Users size={18} /></Icon><span>Members</span><small>soon</small></button>
          </div>
        </nav>
        <div className="sidebar-bottom">
          <button className={`nav-item ${activeNav === 'Settings' ? 'active' : ''}`} onClick={openNumbersSettings}><Icon><Settings size={18} /></Icon><span>Settings</span></button>
          <button className="profile-row"><span className="avatar avatar-small">{profileImage ? <img src={profileImage} alt="" /> : profileInitials}</span><span><strong>{profileName}</strong><small>{profileTitle}</small></span><MoreHorizontal size={17} /></button>
        </div>
      </aside>

      <main className={`main-area ${activeNav === 'Settings' ? 'settings-main' : ''}`}>
        {activeNav === 'Settings' ? <section className="settings-page">
          <header className="settings-page-header"><h1>Settings</h1><p>Manage your profile, calling lines, and connected tools.</p></header>
          <div className="settings-layout">
            <nav className="settings-tabs" aria-label="Settings sections">
              {(['Profile', 'Numbers', 'Integrations'] as const).map(tab => <button key={tab} className={settingsTab === tab ? 'selected' : ''} onClick={() => setSettingsTab(tab)}>{tab}</button>)}
            </nav>
            <section className="settings-content">
              {settingsTab === 'Profile' && <><h2>Profile</h2><p className="settings-description">This information appears to teammates and in shared activity.</p><form className="profile-settings-form" onSubmit={saveProfile}><span className="avatar profile-settings-avatar">{profileImage ? <img src={profileImage} alt="" /> : profileInitials}</span><div><label>Name<input required autoComplete="name" value={profileDraft.displayName} onChange={event => setProfileDraft(current => ({ ...current, displayName: event.target.value }))} /></label><label>Title<input autoComplete="organization-title" value={profileDraft.title} onChange={event => setProfileDraft(current => ({ ...current, title: event.target.value }))} placeholder="Sales representative" /></label></div>{profileError && <p className="settings-error" role="alert">{profileError}</p>}<div className="settings-form-actions"><button className="primary-button" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save profile'}</button></div></form></>}
              {settingsTab === 'Numbers' && <><h2>Numbers</h2><p className="settings-description">Choose the caller ID for your outbound calls and connect new lines here.</p><div className="settings-line-row"><span className="settings-line-icon"><Phone size={17} /></span><div><strong>{selectedLine.number}</strong><span>{selectedLine.provider} · {sipStatus === 'registered' ? 'Connected' : sipStatus === 'connecting' ? 'Connecting' : 'Not connected'}</span></div></div><form className="sip-settings-form" onSubmit={connectSip}><div className="settings-form-heading"><h3>Add a SIP line</h3><p>Use a browser-compatible SIP account with secure WebSocket and WebRTC enabled.</p></div><label>Secure WebSocket server<input required inputMode="url" value={sipProfile.webSocketServer} onChange={event => updateSipProfile('webSocketServer', event.target.value)} placeholder="wss://pbx.example.com:8089/ws" /></label><label>SIP domain<input required value={sipProfile.domain} onChange={event => updateSipProfile('domain', event.target.value)} placeholder="pbx.example.com" /></label><div className="settings-field-row"><label>Extension or username<input required autoComplete="username" value={sipProfile.username} onChange={event => updateSipProfile('username', event.target.value)} placeholder="1001" /></label><label>Password<input required type="password" autoComplete="current-password" value={sipProfile.password} onChange={event => updateSipProfile('password', event.target.value)} placeholder="••••••••" /></label></div>{sipError && <p className="settings-error" role="alert">{sipError}</p>}<div className="settings-form-actions"><button className="primary-button" disabled={sipBusy || isSipConnected}>{isSipConnected ? 'SIP connected' : sipBusy ? 'Connecting…' : 'Connect SIP'}</button></div></form></>}
              {settingsTab === 'Integrations' && <><h2>Integrations</h2><p className="settings-description">Connect the calendar and tools your campaigns use for follow-up.</p><div className="integration-list"><div><strong>Cal.com</strong><span>Meeting booking</span></div><div><strong>Calendly</strong><span>Meeting booking</span></div></div></>}
            </section>
          </div>
        </section> : ['Campaigns', 'Offers', 'Playbooks'].includes(activeNav) ? <section className="resource-page">
          {activeNav === 'Offers' && <><header className="resource-page-header"><div><h1>Offers</h1><p>Define what each campaign is selling.</p></div></header><form className="resource-form" onSubmit={saveOffer}><label>Name<input required value={offerDraft.name} onChange={event => setOfferDraft(current => ({ ...current, name: event.target.value }))} placeholder="e.g. Managed outbound service" /></label><label>Description<textarea value={offerDraft.description} onChange={event => setOfferDraft(current => ({ ...current, description: event.target.value }))} placeholder="The promise, proof, and pains this offer addresses." /></label><button className="primary-button">Save offer</button></form><div className="resource-list">{campaignWorkspace?.offers.map(offer => <div key={offer._id}><strong>{offer.name}</strong><span>{offer.description || 'No description yet.'}</span></div>)}</div></>}
          {activeNav === 'Playbooks' && <><header className="resource-page-header"><div><h1>Playbooks</h1><p>Give each campaign a repeatable conversation flow.</p></div></header><form className="resource-form" onSubmit={savePlaybook}><label>Name<input required value={playbookDraft.name} onChange={event => setPlaybookDraft(current => ({ ...current, name: event.target.value }))} placeholder="e.g. VP Revenue opener" /></label><label>Guidance<textarea required value={playbookDraft.body} onChange={event => setPlaybookDraft(current => ({ ...current, body: event.target.value }))} placeholder="Opener, discovery questions, qualification criteria, and objection guidance." /></label><button className="primary-button">Save playbook</button></form><div className="resource-list">{campaignWorkspace?.playbooks.map(playbook => <div key={playbook._id}><strong>{playbook.name}</strong><span>{playbook.body}</span></div>)}</div></>}
          {activeNav === 'Campaigns' && <><header className="resource-page-header"><div><h1>Campaigns</h1><p>Bring the offer, lead lists, and playbook into one dialable workflow.</p></div></header><form className="resource-form campaign-form" onSubmit={saveCampaign}><label>Name<input required value={campaignDraft.name} onChange={event => setCampaignDraft(current => ({ ...current, name: event.target.value }))} placeholder="e.g. West Coast prospecting" /></label><label>Offer<select value={campaignDraft.offerId} onChange={event => setCampaignDraft(current => ({ ...current, offerId: event.target.value }))}><option value="">No offer yet</option>{campaignWorkspace?.offers.map(offer => <option key={offer._id} value={offer._id}>{offer.name}</option>)}</select></label><label>Playbook<select value={campaignDraft.playbookId} onChange={event => setCampaignDraft(current => ({ ...current, playbookId: event.target.value }))}><option value="">No playbook yet</option>{campaignWorkspace?.playbooks.map(playbook => <option key={playbook._id} value={playbook._id}>{playbook.name}</option>)}</select></label><fieldset><legend>Lead lists</legend>{campaignWorkspace?.leadLists.length ? campaignWorkspace.leadLists.map(list => <label key={list._id} className="check-row"><input type="checkbox" checked={campaignDraft.leadListIds.includes(list._id)} onChange={() => setCampaignDraft(current => ({ ...current, leadListIds: current.leadListIds.includes(list._id) ? current.leadListIds.filter(id => id !== list._id) : [...current.leadListIds, list._id] }))} /> {list.name}</label>) : <span>Import a lead list first.</span>}</fieldset><button className="primary-button">Create campaign</button></form><div className="resource-list">{campaignWorkspace?.campaigns.map(campaign => <div key={campaign._id}><strong>{campaign.name}</strong><span>{campaign.status} · {campaign.leadListIds?.length || 0} lead lists attached</span></div>)}</div></>}
          {resourceError && <p className="settings-error" role="alert">{resourceError}</p>}
        </section> : activeNav === 'Lead lists' ? <section className="lead-lists-page">
          <header className="lead-lists-header"><div><h1>Lead lists</h1><p>Import and organize the people your campaigns call.</p></div><label className="csv-import-button"><input type="file" accept=".csv,text/csv" onChange={event => { void selectCsv(event.target.files?.[0]); event.currentTarget.value = '' }} />Import CSV <Plus size={16} /></label></header>
          {csvImportMessage && <p className="csv-import-message" role="status">{csvImportMessage}</p>}
          {csvPreview ? <section className="csv-mapper"><div><h2>Map your columns</h2><p>{csvPreview.rows.length} rows from {csvPreview.fileName}. Choose where each column belongs before importing.</p></div><div className="csv-mapping-fields">{([['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email'], ['phone', 'Phone'], ['company', 'Company'], ['title', 'Title']] as [keyof ImportedLead, string][]).map(([field, label]) => <label key={field}>{label}<select value={csvMapping[field]} onChange={event => setCsvMapping(current => ({ ...current, [field]: event.target.value }))}><option value="">Do not import</option>{csvPreview.headers.map(header => <option key={header} value={header}>{header}</option>)}</select></label>)}</div><div className="csv-preview"><strong>Preview</strong><div>{csvPreview.headers.map(header => <span key={header}>{header}</span>)}</div>{csvPreview.rows.slice(0, 4).map((row, index) => <div key={index}>{csvPreview.headers.map((header, cell) => <span key={header}>{row[cell]}</span>)}</div>)}</div><div className="csv-mapper-actions"><button className="secondary-button" onClick={() => setCsvPreview(null)}>Cancel</button><button className="primary-button" disabled={csvImporting} onClick={() => void importMappedCsv()}>{csvImporting ? 'Importing…' : `Import ${csvPreview.rows.length} leads`}</button></div></section> : <div className="lead-list-table" role="table" aria-label="Lead lists"><div className="lead-list-table-head" role="row"><span role="columnheader">List</span><span role="columnheader">Source</span><span role="columnheader">Leads</span><span role="columnheader">Updated</span></div>{leadLists.length ? leadLists.map(list => <button key={list._id} className="lead-list-table-row" role="row"><span role="cell"><strong>{list.name}</strong></span><span role="cell">CSV</span><span role="cell">{list.leadCount}</span><span role="cell">{new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(list.updatedAt)}</span></button>) : <div className="lead-lists-empty"><FileText size={22} /><strong>Import your first lead list</strong><span>Upload a CSV, map its columns, then import it into a new lead list.</span></div>}</div>}
        </section> : <>
        <section className="queue-bar">
          <div className="queue-heading"><span className="status-dot" /> <strong>West Coast prospecting</strong><span className="queue-count">{leads.length - selectedLead} contacts remaining</span><button className={`sip-connection ${sipStatus}`} onClick={openNumbersSettings}>{sipStatus === 'registered' ? 'SIP connected' : sipStatus === 'connecting' ? 'SIP connecting' : 'Connect SIP'}</button></div>
          <div className="queue-actions"><button className="text-button" onClick={() => setActiveNav('Campaigns')}><Settings size={16} /> Queue settings</button>{callState === 'ready' ? <button className="start-dialing" onClick={startCall}><Phone size={15} /> Dial {lead.name.split(' ')[0]}</button> : callState === 'dialing' ? <button className="pause-button" disabled><Phone size={16} /> Dialing…</button> : <button className="pause-button" onClick={() => setPaused(!paused)}><Clock3 size={16} /> {paused ? 'Resume' : 'Pause'}</button>}</div>
        </section>
        <div className={`work-grid call-workspace ${callState === 'ready' || callState === 'dialing' ? 'ready-workspace' : ''}`}>
          <aside className="lead-context">{callState === 'ready' || callState === 'dialing' ? <><div className="campaign-list-title"><span>Active lead list</span><strong>Enterprise accounts</strong><small>{leads.length} leads · West Coast prospecting</small></div><div className="lead-section lead-list-only">{leads.map((item, index) => <button key={item.initials} className={`vertical-lead ${selectedLead === index ? 'active' : ''}`} onClick={() => setSelectedLead(index)}><span>{item.initials}</span><div><b>{item.name}</b><small>{item.company} · {item.role}</small></div>{selectedLead === index && <em>Now</em>}</button>)}</div></> : <><div className="lead-profile"><span className="avatar avatar-large">{lead.initials}</span><div><h2>{lead.name}</h2><p>{lead.role}</p><a>{lead.company}</a></div></div><div className="lead-phone"><Phone size={15} /> {lead.phone}</div><div className="lead-event"><strong>Call trigger event</strong><p>Hired 14 new SDRs and announced Series B expansion last week.</p></div><div className="lead-section intelligence"><h3>Company intelligence</h3><div className="intel-grid"><span><small>Funding</small><b>$28M Series B</b></span><span><small>Team size</small><b>180–250 people</b></span></div></div><div className="lead-section"><h3>Account notes</h3><p className="account-note">Mutual connection with Marcus Chen. Prefers direct value statements without fluffy intros.</p></div></>}</aside>
          <section className="conversation-card">
            {callState === 'ready' || callState === 'dialing' ? <><div className="card-head"><div><h2>Live conversation</h2><p>{callState === 'dialing' ? `Calling ${lead.name} · waiting for an answer` : 'Ready to start · transcription begins when connected'}</p></div><span className="live-pill ready">{callState === 'dialing' ? 'Dialing' : 'Ready to dial'}</span></div><div className="conversation-tabs">{['Conversation', 'Notes', 'Activity'].map(tab => <button key={tab} className={activeTab === tab ? 'selected' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div><div className="precall-stream"><Phone size={22} /><strong>{callState === 'dialing' ? 'Waiting for the lead to answer' : 'Live speech stream is ready'}</strong><span>{callState === 'dialing' ? 'Lead details open only after the call is answered.' : 'Start the call to capture the conversation and surface real-time guidance.'}</span>{callError && <small className="call-error">{callError}</small>}</div><div className="conversation-footer">Current lead: {lead.name} · {lead.company}</div></> : <><div className="card-head"><div><h2>Live conversation</h2><p>{callState === 'calling' ? 'Call in progress · 04:38' : 'Call completed'}</p></div><span className={`live-pill ${callState}`}>{callState === 'calling' && <span className="pulse-dot" />}{callState === 'calling' ? 'Live' : 'Completed'}</span></div>
            <div className="conversation-tabs">{['Conversation', 'Notes', 'Activity'].map(tab => <button key={tab} className={activeTab === tab ? 'selected' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
            {activeTab === 'Conversation' ? <>
              <div className="transcript" aria-live="polite">
                <div className="transcript-line"><time>00:42</time><div><span className="speaker-label">You</span><p>Hi Amelia, this is Jamie from Icary. Did I catch you with a couple of minutes?</p></div></div>
                <div className="transcript-line"><time>00:51</time><div><span className="speaker-label customer">Amelia</span><p>Yes, I have a few. We’re actually looking at ways to make our outbound process less manual this quarter.</p></div></div>
                <div className="transcript-line"><time>01:09</time><div><span className="speaker-label">You</span><p>That’s helpful context. What’s creating the most friction for the team today?</p></div></div>
                <div className="transcript-line current"><time>01:22</time><div><span className="speaker-label customer">Amelia</span><p>Mostly context switching. Reps are moving between the dialer, notes, and our CRM after every call…</p><span className="typing-cursor" /></div></div>
              </div>
              <div className="conversation-footer">Live transcription is captured automatically for this call.</div>
            </> : <div className="tab-placeholder"><FileText size={25} /><strong>{activeTab} is ready when you need it</strong><span>Keep the call in focus while you capture the next meaningful detail.</span></div>}
            </>}
          </section>

          {assistantVisible && <aside className="assist-panel">
            <div className="assist-title"><span className="assist-icon"><Bot size={16} /></span><div><h2>Conversation assistant</h2><p>Listening for useful context</p></div><button aria-label="Close assistant" onClick={() => setAssistantVisible(false)}><X size={17} /></button></div>
            <div className="insight-block"><span className="insight-label">Live insight</span><p>Amelia mentioned <strong>context switching</strong> and a <strong>Q3 evaluation</strong>.</p><button className="link-button" onClick={addInsightToNotes}>Add to notes <Plus size={14} /></button></div>
            <div className="assist-section"><h3>Suggested follow-up</h3><p className="assist-copy">Ask how their team currently records call outcomes and prepares for the next touchpoint.</p><button className="ask-button" onClick={() => setAssistantPrompt(!assistantPrompt)}><Bot size={16} /> {assistantPrompt ? 'Question added below' : 'Explore this question'}</button>{assistantPrompt && <p className="assistant-response">Try: “What does your team do between a finished call and the next outreach?”</p>}</div>
            <div className="assist-section"><h3>Relevant context</h3><div className="context-item"><div className="context-symbol"><Users size={16} /></div><div><strong>18-person SDR team</strong><span>Imported from account notes</span></div></div><div className="context-item"><div className="context-symbol"><CalendarDays size={16} /></div><div><strong>Evaluating in Q3</strong><span>Added on last conversation</span></div></div></div>
            <div className="privacy-note"><Bot size={14} /> AI suggestions are based on this conversation and account context.</div>
          </aside>}
        </div>

        <section className="bottom-grid">
          <div className="notes-card"><div className="card-head compact"><div><h2>Call notes</h2><p>Visible to your team</p></div>{saved && <span className="saved">Saved</span>}</div><textarea value={notes} onChange={e => { setNotes(e.target.value); setSaved(false) }} placeholder="Capture the key details, objections, and agreed next steps…" maxLength={500} /><div className="notes-footer"><span>{remaining}/500</span><button className="primary-button" disabled={!notes.trim()} onClick={() => setSaved(true)}>Save notes</button></div></div>
          <div className={`next-card ${callState === 'complete' ? 'outcome-modal' : ''}`}>
            {callState === 'complete' ? <div className="wrapup-modal-content"><div><h2>Wrap up {lead.name}’s call</h2><p>Everything important, in one final review.</p></div><div className="wrapup-status"><span>Meeting</span><strong>{meetingBooked ? 'Booked' : 'Not booked'}</strong><span>Criteria</span><strong>{bookingChecks.filter(Boolean).length}/3 checked</strong><span>Email</span><strong>{draftCreated ? 'Draft ready' : 'No draft'}</strong></div><div className="outcomes"><button className={outcomeDraft === 'Interested' ? 'selected-outcome' : ''} onClick={() => setOutcomeDraft('Interested')}><span className="outcome-icon success"><UserRound size={17} /></span><span><strong>Interested</strong><small>Continue opportunity</small></span></button><button className={outcomeDraft === 'Follow up' ? 'selected-outcome' : ''} onClick={() => setOutcomeDraft('Follow up')}><span className="outcome-icon neutral"><CalendarDays size={17} /></span><span><strong>Follow up</strong><small>Set a later touch</small></span></button><button className={outcomeDraft === 'Not a fit' ? 'selected-outcome' : ''} onClick={() => setOutcomeDraft('Not a fit')}><span className="outcome-icon muted"><ChevronLeft size={17} /></span><span><strong>Not a fit</strong><small>Close out</small></span></button></div><textarea value={notes} onChange={e => { setNotes(e.target.value); setSaved(false) }} placeholder="Add final notes for the account executive…" maxLength={500} /><div className="wrapup-footer"><span>{notes.length}/500</span><div className="wrapup-actions"><button className="secondary-button" disabled={!outcomeDraft} onClick={saveAndPause}>Save</button><button className="primary-button" disabled={!outcomeDraft} onClick={saveWrapUp}>Save & call next</button></div></div></div> : <div className="call-pending"><Phone size={18} /><div><h2>Finish the call to record an outcome</h2><p>Outcomes and follow-ups appear here once the conversation ends.</p></div></div>}
          </div>
        </section>
        {callState === 'calling' && <><div className="call-action-drawer">{bookingOpen && <div className="action-drawer-content"><div><h3>Book a meeting</h3><p>Campaign qualification criteria</p>{['Owns outbound workflow', 'Evaluating this quarter', 'Team has 10+ reps'].map((label, index) => <label key={label}><input type="checkbox" checked={bookingChecks[index]} onChange={() => setBookingChecks(checks => checks.map((checked, itemIndex) => itemIndex === index ? !checked : checked))} /> {label}</label>)}</div><div className="calendar-actions"><button className="secondary-button" disabled={!bookingChecks.every(Boolean)} onClick={() => { setMeetingBooked(true); setBookingOpen(false) }}>Book with Cal.com</button><button className="primary-button" disabled={!bookingChecks.every(Boolean)} onClick={() => { setMeetingBooked(true); setBookingOpen(false) }}>Book with Calendly</button></div></div>}{emailOpen && <div className="action-drawer-content email-drawer"><div><h3>{draftCreated ? 'Draft created' : 'Follow-up email'}</h3><p>{draftCreated ? 'Saved to Amelia’s timeline.' : 'Pre-filled from this conversation'}</p></div><input value={`Recap for ${lead.company}`} readOnly aria-label="Email subject" /><button className="primary-button" onClick={() => setDraftCreated(true)}>{draftCreated ? 'Saved' : 'Create draft'}</button></div>}{dialPadOpen && <div className="dialpad"><output>{dialedDigits || 'Enter digits'}</output>{['1','2 ABC','3 DEF','4 GHI','5 JKL','6 MNO','7 PQRS','8 TUV','9 WXYZ','*','0 +','#'].map(digit => <button key={digit} onClick={() => sendDtmf(digit)}>{digit}</button>)}</div>}</div><nav className="call-action-bar" aria-label="In-call actions"><button onClick={() => setEmailOpen(!emailOpen)} className={emailOpen ? 'active-action' : ''}><MailPlus size={18} /><span>Email</span></button><button onClick={() => setAddedToList(!addedToList)} className={addedToList ? 'active-action' : ''}><ListPlus size={18} /><span>{addedToList ? 'Added' : 'Add to list'}</span></button><button onClick={() => setBookingOpen(!bookingOpen)} className={bookingOpen ? 'active-action' : ''}><CalendarDays size={18} /><span>{meetingBooked ? 'Booked' : 'Book meeting'}</span></button><button onClick={toggleMute} className={muted ? 'active-action' : ''}><MicOff size={18} /><span>{muted ? 'Unmute' : 'Mute'}</span></button><button onClick={() => setDialPadOpen(!dialPadOpen)} className={dialPadOpen ? 'active-action' : ''}><KeyRound size={18} /><span>Dial pad</span></button><button onClick={() => setAssistantVisible(!assistantVisible)}><MoreHorizontal size={20} /><span>{assistantVisible ? 'Hide AI' : 'Show AI'}</span></button><button className="end-call-bar" onClick={endCall}><Phone size={18} /><span>End call</span></button></nav></>}
        </>}
      </main>
      <audio ref={remoteAudio} autoPlay />
    </div>
  )
}

export default App

createRoot(document.getElementById('root')!).render(<ConvexAuthProvider client={convex}><AuthGate>{({ initialSipProfile }) => <App initialSipProfile={initialSipProfile} />}</AuthGate></ConvexAuthProvider>)
