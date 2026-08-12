# Entra app registration for Graph sendMail (contact form)

After Business Basic tenant exists:

1. https://entra.microsoft.com → Applications → App registrations → New
2. Name: `kecktech-contact-mailer`
3. Accounts: single tenant
4. Certificates & secrets → New client secret → copy value to `GRAPH_CLIENT_SECRET`
5. API permissions → Microsoft Graph → **Application** permissions:
   - `Mail.Send`
6. Grant admin consent
7. Overview → copy Application (client) ID → `GRAPH_CLIENT_ID`
8. Overview → copy Directory (tenant) ID → `GRAPH_TENANT_ID`
9. Set `GRAPH_MAILBOX=support@kecktech.net` (shared mailbox primary address)

The mailer authenticates as the app and sends **as** the shared mailbox user. Ensure the shared mailbox exists first (`02-setup-shared-mailbox.ps1`).

Deploy: put secrets in the host `.env` next to `docker-compose.yml` (do not commit), then rebuild `kecktech-mailer`.
