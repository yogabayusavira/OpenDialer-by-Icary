import { useAuthActions } from '@convex-dev/auth/react'
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from 'convex/react'
import { ArrowLeft, ArrowRight, Building2, Check, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api } from '../convex/_generated/api'
import dialerPhoto from './assets/login-dialer.png'
import type { SipProfile } from './lib/sip'
import './auth.css'

type AppLaunch = { initialSipProfile?: SipProfile }
const emptySipProfile: SipProfile = {
  provider: 'sip',
  transport: 'udp',
  server: '',
  port: 5060,
  domain: '',
  username: '',
  password: '',
}

function AuthWordmark() { return <div className="auth-wordmark"><span className="auth-wordmark-mark">i</span><span className="auth-wordmark-copy"><strong>OpenDialer</strong><small>by icary</small></span></div> }
function AuthStatus({ children }: { children: ReactNode }) { return <div className="auth-shell auth-status"><AuthWordmark /><div className="auth-status-copy"><span className="auth-spinner" /><p>{children}</p></div></div> }

function SignIn() {
  const { signIn } = useAuthActions()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState<'google' | 'email' | null>(null)
  const continueWithGoogle = async () => { setMessage(''); setSubmitting('google'); try { await signIn('google') } catch { setMessage('Google sign-in is not configured yet. Add the Google OAuth credentials in Convex, then try again.'); setSubmitting(null) } }
  const sendEmailLink = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setMessage(''); setSubmitting('email'); try { const form = new FormData(); form.set('email', email); await signIn('resend', form); setMessage('Check your inbox for a secure sign-in link.') } catch { setMessage('Email sign-in is not configured yet. Add the email provider credentials in Convex, then try again.') } finally { setSubmitting(null) } }
  return <div className="auth-shell"><section className="auth-panel" aria-labelledby="auth-title"><AuthWordmark /><div className="auth-intro"><h1 id="auth-title">Start where your calls happen.</h1><p>Sign in to keep your campaigns, calling activity, and personal workspace in one place.</p></div><div className="auth-actions"><button className="auth-google" onClick={continueWithGoogle} disabled={submitting !== null}>{submitting === 'google' ? 'Opening Google…' : <>Continue with Google <ArrowRight size={17} /></>}</button><div className="auth-divider"><span />or continue with email<span /></div><form onSubmit={sendEmailLink} className="auth-email-form"><label htmlFor="email">Work email</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" required /><button className="auth-email-button" disabled={submitting !== null}>{submitting === 'email' ? 'Sending link…' : <><Mail size={16} /> Email me a sign-in link</>}</button></form>{message && <p className="auth-message" role="status">{message}</p>}</div><p className="auth-footnote"><ShieldCheck size={14} /> Your calling workspace stays private to you and your organizations.</p></section><aside className="auth-aside" style={{ backgroundImage: `url(${dialerPhoto})` }}><div><Phone size={22} /><h2>Ready when the conversation starts.</h2><p>OpenDialer keeps the queue, call context, notes, and real-time guidance together—so you can stay with the prospect.</p></div></aside></div>
}

function Onboarding({ onComplete }: { onComplete: (launch: AppLaunch) => void }) {
  const state = useQuery(api.organizations.onboardingState)
  const completeOnboarding = useMutation(api.organizations.completeOnboarding)
  const [screen, setScreen] = useState<'details' | 'sip'>('details')
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  const [sipProfile, setSipProfile] = useState<SipProfile>(emptySipProfile)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (state?.complete) onComplete({}) }, [state?.complete, onComplete])
  if (!state || state.complete) return <AuthStatus>Preparing your workspace…</AuthStatus>
  const nameValue = displayName ?? state.profile.displayName
  const titleValue = title ?? state.profile.title
  const organizationValue = organizationName ?? state.organizationName
  const initials = nameValue.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'OD'
  const save = async (initialSipProfile?: SipProfile) => {
    setSubmitted(true); setError('')
    try { await completeOnboarding({ displayName: nameValue, title: titleValue, organizationName: organizationValue }); onComplete({ initialSipProfile }) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'We could not save your setup. Please try again.') }
    finally { setSubmitted(false) }
  }
  const updateSip = (field: keyof SipProfile, value: string | number) => setSipProfile(current => ({ ...current, [field]: value }))
  const intro = screen === 'details' ? <><h1 id="onboarding-title">Make this your call desk.</h1><p>Use your details so teammates know who is calling. You can edit everything later.</p></> : <><h1 id="onboarding-title">Connect your SIP account.</h1><p>Enter your standard SIP credentials to connect directly over UDP/TCP/TLS like Zoiper 5.</p></>
  return <div className="auth-shell onboarding-shell"><section className="auth-panel onboarding-panel" aria-labelledby="onboarding-title"><AuthWordmark /><div className="onboarding-intro">{intro}</div>
    {screen === 'details' ? <form className="onboarding-form" onSubmit={event => { event.preventDefault(); setScreen('sip') }}><section className="onboarding-group" aria-labelledby="profile-heading"><h2 id="profile-heading"><UserRound size={16} /> Your profile</h2><div className="profile-fields"><div className="onboarding-avatar">{state.profile.image ? <img src={state.profile.image} alt="Your Google profile" /> : initials}</div><div><label htmlFor="onboarding-name">Name</label><input id="onboarding-name" value={nameValue} onChange={event => setDisplayName(event.target.value)} required autoComplete="name" /><p>Using your Google profile photo.</p></div></div><label htmlFor="onboarding-title-field">Title <span>Optional</span></label><input id="onboarding-title-field" value={titleValue} onChange={event => setTitle(event.target.value)} placeholder="Sales representative" autoComplete="organization-title" /></section><section className="onboarding-group" aria-labelledby="organization-heading"><h2 id="organization-heading"><Building2 size={16} /> Your organization</h2><label htmlFor="organization-name">Organization name</label><input id="organization-name" value={organizationValue} onChange={event => setOrganizationName(event.target.value)} required placeholder="e.g. Northstar Sales" /><p>This is your private workspace for now. Invite a team later.</p></section><section className="onboarding-group connection-group" aria-labelledby="connection-heading"><h2 id="connection-heading"><Phone size={16} /> Calling connection</h2><div className="connection-choice selected"><span className="connection-icon"><Phone size={17} /></span><span className="connection-details"><strong>SIP (UDP / TLS)</strong><small>Connect native PBX account next</small></span><Check size={16} /></div><div className="connection-soon" aria-label="Twilio coming soon"><span>Twilio</span><small>Soon</small></div><div className="connection-soon" aria-label="Telnyx coming soon"><span>Telnyx</span><small>Soon</small></div></section>{error && <p className="onboarding-error" role="alert">{error}</p>}<div className="onboarding-actions"><button type="button" className="onboarding-skip" onClick={() => void save()} disabled={submitted}>Set up later</button><button className="auth-google onboarding-finish" disabled={submitted}>Continue to SIP <ArrowRight size={17} /></button></div></form> : <form className="onboarding-form sip-onboarding-form" onSubmit={event => { event.preventDefault(); void save(sipProfile) }}><section className="onboarding-group"><label htmlFor="sip-server">SIP Server / Host IP</label><input id="sip-server" value={sipProfile.server || ''} onChange={event => updateSip('server', event.target.value)} placeholder="pbx.mycompany.com or 198.51.100.1" required /><div className="sip-onboarding-row"><label htmlFor="sip-domain">SIP Domain / Realm<input id="sip-domain" value={sipProfile.domain} onChange={event => updateSip('domain', event.target.value)} placeholder="pbx.mycompany.com" required /></label><label htmlFor="sip-port">Port<input id="sip-port" type="number" value={sipProfile.port || 5060} onChange={event => updateSip('port', Number(event.target.value))} placeholder="5060" /></label></div><div className="sip-onboarding-row"><label htmlFor="sip-username">Extension or username<input id="sip-username" autoComplete="username" value={sipProfile.username} onChange={event => updateSip('username', event.target.value)} placeholder="1001" required /></label><label htmlFor="sip-password">Password<input id="sip-password" type="password" autoComplete="current-password" value={sipProfile.password} onChange={event => updateSip('password', event.target.value)} placeholder="••••••••" required /></label></div><p>Your credentials connect directly via native desktop networking. OpenDialer does not require a WebSocket bridge.</p></section>{error && <p className="onboarding-error" role="alert">{error}</p>}<div className="onboarding-actions"><button type="button" className="onboarding-skip" onClick={() => setScreen('details')} disabled={submitted}><ArrowLeft size={15} /> Back</button><button className="auth-google onboarding-finish" disabled={submitted}>{submitted ? 'Connecting…' : 'Connect & finish'} <ArrowRight size={17} /></button></div></form>}
  </section><aside className="auth-aside onboarding-aside" style={{ backgroundImage: `url(${dialerPhoto})` }}><div><h2>{screen === 'details' ? 'One workspace. No handoff.' : 'Native VoIP. Exactly like Zoiper 5.'}</h2><p>{screen === 'details' ? 'Import a list, connect a number, and put the first real conversation in motion.' : 'Connect directly to Asterisk, FreeSWITCH, 3CX, or standard PBX over UDP/TLS without WebSocket bridges.'}</p></div></aside></div>
}

function BootstrapAccount({ children }: { children: (launch: AppLaunch) => ReactNode }) { const [launch, setLaunch] = useState<AppLaunch | null>(null); return launch ? <>{children(launch)}</> : <Onboarding onComplete={setLaunch} /> }
export function AuthGate({ children }: { children: (launch: AppLaunch) => ReactNode }) { return <><AuthLoading><AuthStatus>Checking your session…</AuthStatus></AuthLoading><Unauthenticated><SignIn /></Unauthenticated><Authenticated><BootstrapAccount>{children}</BootstrapAccount></Authenticated></> }
