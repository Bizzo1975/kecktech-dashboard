import { NextRequest, NextResponse } from "next/server"

async function graphToken(tenant: string, clientId: string, secret: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: secret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  })
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = await res.json()
  if (!json.access_token) throw new Error(json.error_description || "token failed")
  return json.access_token as string
}

async function graphSend(opts: {
  token: string
  sendAsMailbox: string
  from: string
  to: string
  subject: string
  body: string
  replyTo?: string
}): Promise<boolean> {
  const message: Record<string, unknown> = {
    subject: opts.subject,
    body: { contentType: "Text", content: opts.body },
    from: { emailAddress: { address: opts.from } },
    toRecipients: [{ emailAddress: { address: opts.to } }],
  }
  if (opts.replyTo) {
    message.replyTo = [{ emailAddress: { address: opts.replyTo } }]
  }
  const send = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(opts.sendAsMailbox)}/sendMail`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message, saveToSentItems: true }),
    }
  )
  if (!send.ok) {
    const err = await send.text()
    console.error("Graph send failed", send.status, err)
    return false
  }
  return true
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, message } = await req.json()
    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email, and message are required" }, { status: 400 })
    }
    const tenant = process.env.GRAPH_TENANT_ID || ""
    const clientId = process.env.GRAPH_CLIENT_ID || ""
    const secret = process.env.GRAPH_CLIENT_SECRET || ""
    const sendAsMailbox = process.env.GRAPH_MAILBOX || "support@kecktech.net"
    const brandFrom = process.env.GRAPH_MAILBOX_JACOB || "hello@jacob-roman.com"
    const brandName = "Jacob Roman"
    if (!tenant || !clientId || !secret) {
      return NextResponse.json({ error: "Mail not configured" }, { status: 500 })
    }
    const token = await graphToken(tenant, clientId, secret)

    const staffOk = await graphSend({
      token,
      sendAsMailbox,
      from: brandFrom,
      to: brandFrom,
      subject: `[Contact] ${name}`,
      body: `New contact form submission\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n`,
      replyTo: String(email),
    })
    if (!staffOk) {
      return NextResponse.json({ error: "Mail delivery failed" }, { status: 500 })
    }

    // Confirmation to submitter (brand From only; no cross-brand mention)
    try {
      const who = String(name).trim() || "there"
      await graphSend({
        token,
        sendAsMailbox,
        from: brandFrom,
        to: String(email),
        subject: `We received your message — ${brandName}`,
        body:
          `Hi ${who},\n\n` +
          `Thanks for writing. I received your message and will get back to you soon.\n\n` +
          `If you need to add anything, reply to this email.\n\n` +
          `— ${brandName}\n`,
      })
    } catch (e) {
      console.error("Confirmation send failed", e)
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Mail delivery failed" }, { status: 500 })
  }
}
