/**
 * Subscribe an email to Listmonk (double opt-in when enabled on the list).
 * Env:
 *   LISTMONK_URL=http://10.20.0.203:9000
 *   LISTMONK_API_USER=admin
 *   LISTMONK_API_TOKEN=...  (password or API token)
 *   LISTMONK_LIST_ID=3      (preferred numeric id)
 *   LISTMONK_LIST_UUID=...  (fallback if id unset)
 */
export async function listmonkSubscribe(opts: {
  email: string
  name?: string
  attribs?: Record<string, unknown>
}): Promise<{ ok: boolean; error?: string }> {
  const base = (process.env.LISTMONK_URL || '').replace(/\/$/, '')
  const user = process.env.LISTMONK_API_USER || ''
  const token = process.env.LISTMONK_API_TOKEN || ''
  const listIdRaw = process.env.LISTMONK_LIST_ID || ''
  const listUuid = process.env.LISTMONK_LIST_UUID || ''
  const listRef = listIdRaw ? Number(listIdRaw) : listUuid
  if (!base || !user || !token || !listRef) {
    return { ok: false, error: 'Listmonk not configured' }
  }

  const auth = Buffer.from(`${user}:${token}`).toString('base64')
  const res = await fetch(`${base}/api/subscribers`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: opts.email,
      name: opts.name || '',
      status: 'enabled',
      lists: [listRef],
      attribs: opts.attribs || {},
      preconfirm_subscriptions: false,
    }),
  })

  if (res.ok || res.status === 409) {
    return { ok: true }
  }
  const text = await res.text()
  console.error('Listmonk subscribe failed', res.status, text)
  return { ok: false, error: text || `HTTP ${res.status}` }
}
