#!/bin/bash
set -e

# Generate msmtp config from environment variables
cat > /etc/msmtprc <<EOF
account default
host ${SMTP_HOST:-10.20.0.110}
port ${SMTP_PORT:-587}
auth on
user ${SMTP_USER:-no-reply@kecktech.net}
password ${SMTP_PASS:?SMTP_PASS environment variable is required}
from ${SMTP_FROM:-no-reply@kecktech.net}
tls on
tls_starttls on
tls_certcheck off
logfile /var/log/msmtp.log
EOF

chmod 644 /etc/msmtprc
touch /var/log/msmtp.log
chmod 666 /var/log/msmtp.log

echo "[mailer] msmtp configured for ${SMTP_USER:-no-reply@kecktech.net} via ${SMTP_HOST:-10.20.0.110}:${SMTP_PORT:-587}"

# Hand off to original CMD
exec "$@"