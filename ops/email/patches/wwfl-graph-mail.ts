/**
 * Microsoft Graph sendMail helper for WWFL contact / newsletter flows.
 * Env: GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET,
 *      GRAPH_MAILBOX (shared, default support@kecktech.net),
 *      GRAPH_FROM / FROM_EMAIL / ADMIN_EMAIL (visible From alias)
 */

export type GraphSendOpts = {
  to: string
  subject: string
  body: string
  from?: string
  replyTo?: string
}

async function graphToken(): Promise<string> {
  const tenant = process.env.GRAPH_TENANT_ID || ''
  const clientId = process.env.GRAPH_CLIENT_ID || ''
  const secret = process.env.GRAPH_CLIENT_SECRET || ''
  if (!tenant || !clientId || !secret) {
    throw new Error('GRAPH_TENANT_ID, GRAPH_CLIENT_ID, and GRAPH_CLIENT_SECRET are required')
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!json.access_token) {
    throw new Error(json.error_description || json.error || 'Graph token failed')
  }
  return json.access_token as string
}

export function graphBrandFrom(): string {
  return (
    process.env.GRAPH_FROM ||
    process.env.FROM_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'hello@willworkforlunch.com'
  )
}

export function graphSendAsMailbox(): string {
  return process.env.GRAPH_MAILBOX || 'support@kecktech.net'
}

export function graphConfigured(): boolean {
  return Boolean(
    process.env.GRAPH_TENANT_ID &&
      process.env.GRAPH_CLIENT_ID &&
      process.env.GRAPH_CLIENT_SECRET
  )
}

export async function graphSendMail(opts: GraphSendOpts): Promise<boolean> {
  const token = await graphToken()
  const sendAs = graphSendAsMailbox()
  const from = opts.from || graphBrandFrom()
  const message: Record<string, unknown> = {
    subject: opts.subject,
    body: { contentType: 'Text', content: opts.body },
    from: { emailAddress: { address: from } },
    toRecipients: [{ emailAddress: { address: opts.to } }],
  }
  if (opts.replyTo) {
    message.replyTo = [{ emailAddress: { address: opts.replyTo } }]
  }
  const send = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sendAs)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
    }
  )
  if (!send.ok) {
    const err = await send.text()
    console.error('Graph send failed', send.status, err)
    return false
  }
  return true
}

export async function graphSendContactConfirmation(
  toSubmitter: string,
  submitterName: string,
  brandName = 'willworkforlunch'
): Promise<boolean> {
  const who = (submitterName || '').trim() || 'there'
  const from = graphBrandFrom()
  return graphSendMail({
    to: toSubmitter,
    from,
    subject: `We received your message — ${brandName}`,
    body:
      `Hi ${who},\n\n` +
      `Thanks for contacting ${brandName}. We received your message and will get back to you soon ` +
      `(typically within 2 business hours on weekdays).\n\n` +
      `If you need to add anything, reply to this email.\n\n` +
      `— ${brandName}\n`,
  })
}
