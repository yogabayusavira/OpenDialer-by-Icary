import { Web } from 'sip.js'

export type SipTransport = 'webrtc' | 'udp' | 'tls' | 'tcp'

export type SipProfile = {
  provider?: 'sip' | 'telnyx' | 'twilio'
  transport?: SipTransport
  server?: string
  port?: number
  domain: string
  username: string
  authUsername?: string
  password: string
  callerId?: string
  displayName?: string
  webSocketServer?: string
  outboundProxy?: string
}

export type SipConnectionStatus = 'disconnected' | 'connecting' | 'registered' | 'error'

type SipEvents = {
  onStatusChange: (status: SipConnectionStatus, message?: string) => void
  onCallAnswered: () => void
  onCallEnded: () => void
}

const toDestination = (phone: string, domain: string) => {
  if (phone.startsWith('sip:')) return phone
  const number = phone.replace(/[^+\d]/g, '')
  return `sip:${number}@${domain}`
}

export const getEffectiveWebSocketServer = (profile: SipProfile): string => {
  if (profile.webSocketServer && profile.webSocketServer.trim().length > 0) {
    return profile.webSocketServer.trim()
  }
  const host = profile.server || profile.domain
  if (profile.transport === 'tls') {
    return `wss://${host}:${profile.port || 5061}/ws`
  }
  if (profile.transport === 'udp' || profile.transport === 'tcp') {
    return `wss://${host}:${profile.port || 8089}/ws`
  }
  return `wss://${host}:${profile.port || 8089}/ws`
}

export class SipClient {
  private user?: Web.SimpleUser
  private profile?: SipProfile

  async connect(profile: SipProfile, remoteAudio: HTMLAudioElement, events: SipEvents) {
    await this.disconnect()
    this.profile = profile
    events.onStatusChange('connecting')

    const wsServer = getEffectiveWebSocketServer(profile)
    const domain = profile.domain || profile.server || ''
    const aor = `sip:${profile.username}@${domain}`

    const user = new Web.SimpleUser(wsServer, {
      aor,
      media: {
        constraints: { audio: true, video: false },
        remote: { audio: remoteAudio },
      },
      userAgentOptions: {
        authorizationUsername: profile.authUsername || profile.username,
        authorizationPassword: profile.password,
        displayName: profile.displayName || profile.callerId || profile.username,
      },
      delegate: {
        onRegistered: () => events.onStatusChange('registered'),
        onServerDisconnect: (error) =>
          events.onStatusChange('error', error?.message || 'SIP connection was lost.'),
        onCallAnswered: events.onCallAnswered,
        onCallHangup: events.onCallEnded,
      },
    })

    this.user = user
    try {
      await user.connect()
      await user.register()
    } catch (error) {
      this.user = undefined
      const message =
        error instanceof Error ? error.message : 'Icary could not connect to this SIP account.'
      events.onStatusChange('error', message)
      throw error
    }
  }

  async call(phone: string) {
    if (!this.user || !this.profile) throw new Error('Connect a SIP account before placing a call.')
    const domain = this.profile.domain || this.profile.server || ''
    await this.user.call(toDestination(phone, domain))
  }

  async hangup() {
    if (this.user) await this.user.hangup()
  }

  mute() {
    this.user?.mute()
  }

  unmute() {
    this.user?.unmute()
  }

  async sendDtmf(tone: string) {
    if (this.user) await this.user.sendDTMF(tone)
  }

  async disconnect() {
    if (!this.user) return
    try {
      if (this.user.isConnected()) await this.user.unregister()
      await this.user.disconnect()
    } catch {
      // Cleanup failure should not block a new connection.
    } finally {
      this.user = undefined
    }
  }
}
