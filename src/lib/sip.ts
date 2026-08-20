export type SipTransport = 'udp' | 'tcp' | 'tls' | 'webrtc'

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

export type SipEvents = {
  onStatusChange: (status: SipConnectionStatus, message?: string) => void
  onCallAnswered: () => void
  onCallEnded: () => void
}

const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
}

export class SipClient {
  private profile?: SipProfile
  private unlistenReg?: () => void
  private unlistenCall?: () => void
  private isTauri = isTauriEnvironment()

  async connect(profile: SipProfile, _remoteAudio: HTMLAudioElement | null, events: SipEvents) {
    await this.disconnect()
    this.profile = profile
    events.onStatusChange('connecting')

    if (this.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const { listen } = await import('@tauri-apps/api/event')

        // Listen for native registration events
        this.unlistenReg = await listen<{ status: SipConnectionStatus; message?: string }>(
          'sip://registration-status',
          (event) => {
            events.onStatusChange(event.payload.status, event.payload.message)
          }
        )

        // Listen for native call state events
        this.unlistenCall = await listen<{ state: string; error_message?: string }>(
          'sip://call-state',
          (event) => {
            const state = event.payload.state
            if (state === 'connected') {
              events.onCallAnswered()
            } else if (state === 'ended') {
              events.onCallEnded()
            } else if (event.payload.error_message) {
              events.onStatusChange('error', event.payload.error_message)
            }
          }
        )

        const port = Number(profile.port) || (profile.transport === 'tls' ? 5061 : 5060)
        const transport = profile.transport === 'tls' ? 'tls' : profile.transport === 'tcp' ? 'tcp' : 'udp'

        await invoke('sip_register', {
          account: {
            username: profile.username,
            password: profile.password,
            domain: profile.domain || profile.server || '',
            server: profile.server || profile.domain || '',
            port,
            auth_username: profile.authUsername || undefined,
            caller_id: profile.callerId || undefined,
            display_name: profile.displayName || undefined,
            transport,
            outbound_proxy: profile.outboundProxy || undefined,
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        events.onStatusChange('error', message || 'Could not connect to native SIP PBX.')
        throw error
      }
    } else {
      // Browser preview mode
      setTimeout(() => {
        events.onStatusChange('registered')
      }, 500)
    }
  }

  async call(phone: string) {
    if (!this.profile) throw new Error('Connect a SIP account before placing a call.')

    if (this.isTauri) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('sip_call', { destination: phone })
    }
  }

  async hangup() {
    if (this.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('sip_hangup')
      } catch {}
    }
  }

  async mute() {
    if (this.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('sip_mute', { muted: true })
      } catch {}
    }
  }

  async unmute() {
    if (this.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('sip_mute', { muted: false })
      } catch {}
    }
  }

  async sendDtmf(tone: string) {
    if (this.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('sip_send_dtmf', { digits: tone })
      } catch {}
    }
  }

  async disconnect() {
    if (this.unlistenReg) {
      this.unlistenReg()
      this.unlistenReg = undefined
    }
    if (this.unlistenCall) {
      this.unlistenCall()
      this.unlistenCall = undefined
    }
    if (this.isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('sip_unregister')
      } catch {}
    }
  }
}
