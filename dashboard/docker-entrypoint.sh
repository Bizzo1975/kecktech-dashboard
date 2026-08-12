#!/bin/bash
set -e

# Validate Graph credentials (required for contact form outbound mail)
: "${GRAPH_TENANT_ID:?GRAPH_TENANT_ID is required}"
: "${GRAPH_CLIENT_ID:?GRAPH_CLIENT_ID is required}"
: "${GRAPH_CLIENT_SECRET:?GRAPH_CLIENT_SECRET is required}"

MAILBOX="${GRAPH_MAILBOX:-support@kecktech.net}"
echo "[mailer] Microsoft Graph sendMail configured for mailbox ${MAILBOX}"

# Hand off to original CMD
exec "$@"
