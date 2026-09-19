# Security Policy

Do not open a public issue containing a vulnerability, credential, private infrastructure detail, or client data. Report it privately to the Kecktech operator through the established secure operations channel.

- Do not include secrets, exploit payloads containing private data, or production records in reports.
- Record affected service/version, impact, safe reproduction, and recommended containment.
- Critical exploitable findings block release and require immediate operator escalation.
- High findings require remediation or a documented, approved, expiring exception.
- Credential rotation and destructive containment require the explicit approvals in `PROJECT_INSTRUCTIONS.md`.

The application-security verification baseline is OWASP ASVS 5.0 Level 2. Security fixes require regression coverage and validation that logs, responses, artifacts, and browser bundles do not leak sensitive data.

<!-- BEGIN KECKTECH SECURITY POLICY 2026.08.18.1 -->

Report vulnerabilities through the established private Kecktech operations
channel. Never disclose credentials, private infrastructure, client/family data,
biometric material, or production records. OWASP ASVS 5.0 Level 2 is the minimum
web baseline. Critical exploitable findings block release; high findings require
remediation or an approved expiring exception. Credential rotation and destructive
containment require the exact approvals in PROJECT_INSTRUCTIONS.md.

<!-- END KECKTECH SECURITY POLICY 2026.08.18.1 -->






