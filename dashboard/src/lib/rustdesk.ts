/**
 * RustDesk server configuration.
 * Populated from env vars after running:
 *   docker exec rustdesk-id cat /root/id_ed25519.pub
 * Then set in docker/.env:
 *   RUSTDESK_SERVER_HOST=<your VM public IP or hostname>
 *   RUSTDESK_PUBLIC_KEY=<output of cat command above>
 */

export type RustDeskInfo = {
  serverHost: string;
  publicKey: string;
  idPort: number;
  relayPort: number;
  downloadUrl: string;
  /** true only when both RUSTDESK_SERVER_HOST and RUSTDESK_PUBLIC_KEY are set */
  configured: boolean;
};

export function getRustDeskInfo(): RustDeskInfo {
  const serverHost = process.env.RUSTDESK_SERVER_HOST?.trim() ?? "";
  const publicKey = process.env.RUSTDESK_PUBLIC_KEY?.trim() ?? "";

  return {
    serverHost,
    publicKey,
    idPort: 21115,
    relayPort: 21117,
    downloadUrl: "https://rustdesk.io/",
    configured: !!(serverHost && publicKey),
  };
}

/**
 * Formats the one-line config string a technician pastes into their RustDesk client:
 *   Settings → Network → ID/Relay Server
 */
export function formatClientConfig(info: RustDeskInfo): string {
  if (!info.configured) return "Not configured — set RUSTDESK_SERVER_HOST and RUSTDESK_PUBLIC_KEY in docker/.env";
  return `ID Server: ${info.serverHost}  |  Relay: ${info.serverHost}  |  Key: ${info.publicKey}`;
}

/**
 * Formats the instruction note posted to a Zammad ticket when a tech
 * requests a remote session with a customer.
 */
export function formatRemoteSessionNote(info: RustDeskInfo): string {
  if (!info.configured) {
    return "RustDesk is not yet configured on this server. Please contact your admin.";
  }
  return `--- Remote Support Session Request ---

To allow your Kecktech technician to access your device, please follow these steps:

1. Download RustDesk (free, secure remote support tool):
   ${info.downloadUrl}

2. Install and open RustDesk.

3. In RustDesk settings (gear icon → Network → ID/Relay Server), enter:
   ID Server:    ${info.serverHost}
   Relay Server: ${info.serverHost}
   Key:          ${info.publicKey}

4. Share your 9-digit RustDesk ID (shown on the main screen) with your technician.

5. Your technician will connect — you will see a permission prompt on your screen.
   Click "Accept" to start the session.

Your technician is standing by. Reply to this ticket with your RustDesk ID when ready.

--- Internal Note ---`;
}
