"use client";

import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerInfo {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  username: string;
  password: string;
}

type StepStatus = "idle" | "running" | "success" | "error" | "skipped";

interface StepResult {
  status: StepStatus;
  message: string;
  detail?: string;
  link?: { href: string; label: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePassword(length = 18): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*";
  const all = upper + lower + digits + special;
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let pw = upper[array[0] % upper.length]
    + lower[array[1] % lower.length]
    + digits[array[2] % digits.length]
    + special[array[3] % special.length];
  for (let i = 4; i < length; i++) {
    pw += all[array[i] % all.length];
  }
  return pw.split("").sort(() => Math.random() - 0.5).join("");
}

function deriveUsername(fullName: string): string {
  return fullName
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(".");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<StepStatus, { bg: string; border: string; dot: string; label: string }> = {
  idle:    { bg: "#1e293b", border: "#334155", dot: "#475569", label: "Waiting" },
  running: { bg: "#1e3a5f", border: "#3b82f6", dot: "#3b82f6", label: "Running…" },
  success: { bg: "#0d2b1e", border: "#22c55e", dot: "#22c55e", label: "Done" },
  error:   { bg: "#2b1414", border: "#f87171", dot: "#f87171", label: "Failed" },
  skipped: { bg: "#1e293b", border: "#64748b", dot: "#64748b", label: "Skipped" },
};

function StatusBadge({ status }: { status: StepStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      fontSize: "11px",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      color: s.dot,
      padding: "2px 8px",
      borderRadius: "999px",
      border: `1px solid ${s.border}`,
      background: s.bg,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: s.dot,
        ...(status === "running" ? { animation: "pulse 1s ease-in-out infinite" } : {}),
      }} />
      {s.label}
    </span>
  );
}

function StepCard({
  number,
  title,
  status,
  children,
}: {
  number: number;
  title: string;
  status: StepStatus;
  children: React.ReactNode;
}) {
  const s = STATUS_STYLES[status];
  return (
    <div style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      borderRadius: "10px",
      padding: "20px 24px",
      marginBottom: "14px",
      transition: "border-color 0.3s, background 0.3s",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            width: 28, height: 28, borderRadius: "50%",
            background: s.dot, color: "#0f172a",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "13px", fontWeight: 700, flexShrink: 0,
          }}>
            {number}
          </span>
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#e2e8f0" }}>{title}</h3>
        </div>
        <StatusBadge status={status} />
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#475569" }}>{hint}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "6px",
  color: "#e2e8f0",
  fontSize: "14px",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: "6px 12px",
        background: copied ? "#22c55e22" : "#1e293b",
        border: `1px solid ${copied ? "#22c55e" : "#334155"}`,
        borderRadius: "6px",
        color: copied ? "#22c55e" : "#94a3b8",
        fontSize: "12px",
        cursor: "pointer",
        fontFamily: "inherit",
        flexShrink: 0,
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function ResultRow({ result }: { result: StepResult }) {
  if (result.status === "idle") return null;
  return (
    <div style={{ marginTop: "10px" }}>
      {result.message && (
        <p style={{
          margin: "0 0 6px",
          fontSize: "13px",
          color: result.status === "error" ? "#f87171" : result.status === "success" ? "#86efac" : "#94a3b8",
        }}>
          {result.message}
        </p>
      )}
      {result.detail && (
        <p style={{ margin: "0 0 6px", fontSize: "12px", color: "#64748b" }}>{result.detail}</p>
      )}
      {result.link && (
        <a
          href={result.link.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "13px", color: "#3b82f6", textDecoration: "underline" }}
        >
          {result.link.label} ↗
        </a>
      )}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function CustomerOnboardingPage() {
  const [info, setInfo] = useState<CustomerInfo>({
    fullName: "",
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    username: "",
    password: generatePassword(),
  });

  const [showPassword, setShowPassword] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const [steps, setSteps] = useState<{
    lldap: StepResult;
    zammad: StepResult;
    erpnext: StepResult;
  }>({
    lldap:   { status: "idle", message: "" },
    zammad:  { status: "idle", message: "" },
    erpnext: { status: "idle", message: "" },
  });

  const setStep = useCallback(
    (key: "lldap" | "zammad" | "erpnext", result: Partial<StepResult>) => {
      setSteps((prev) => ({ ...prev, [key]: { ...prev[key], ...result } }));
    },
    []
  );

  // Auto-derive username when full name changes
  const handleFullNameChange = (v: string) => {
    const parts = v.trim().split(/\s+/);
    setInfo((prev) => ({
      ...prev,
      fullName: v,
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      username: deriveUsername(v),
    }));
  };

  const regeneratePassword = () => {
    setInfo((prev) => ({ ...prev, password: generatePassword() }));
  };

  const canRun = info.fullName && info.email && info.company && info.username && info.password;

  const runOnboarding = async () => {
    if (!canRun || running) return;
    setRunning(true);
    setDone(false);

    // ── Step 2: LLDAP ──────────────────────────────────────────────────
    setStep("lldap", { status: "running", message: "Creating LLDAP account…" });
    try {
      const res = await fetch("/api/ops/onboard/lldap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: info.username,
          email: info.email,
          displayName: info.fullName,
          firstName: info.firstName,
          lastName: info.lastName,
          password: info.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStep("lldap", {
          status: "error",
          message: `LLDAP failed: ${data.error}`,
          link: { href: "https://ldap.kecktech.net", label: "Open LLDAP manually" },
        });
      } else {
        setStep("lldap", {
          status: "success",
          message: data.alreadyExisted
            ? `User @${info.username} already existed — added to kecktech_customers.`
            : `User @${info.username} created and added to kecktech_customers.`,
        });
      }
    } catch (err) {
      setStep("lldap", {
        status: "error",
        message: `Network error: ${String(err)}`,
        link: { href: "https://ldap.kecktech.net", label: "Open LLDAP manually" },
      });
    }

    // ── Step 3: Zammad ─────────────────────────────────────────────────
    setStep("zammad", { status: "running", message: "Creating Zammad customer account…" });
    try {
      const res = await fetch("/api/ops/onboard/zammad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: info.email,
          displayName: info.fullName,
          company: info.company,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStep("zammad", {
          status: "error",
          message: `Zammad failed: ${data.error}`,
          link: { href: "https://tickets.kecktech.net/#user/new", label: "Create manually in Zammad" },
        });
      } else {
        setStep("zammad", {
          status: "success",
          message: data.alreadyExisted
            ? `Customer already exists in Zammad (ID: ${data.userId}).`
            : `Zammad customer created (ID: ${data.userId})${data.orgId ? ` — linked to org #${data.orgId}` : " — no matching org found"}.`,
        });
      }
    } catch (err) {
      setStep("zammad", {
        status: "error",
        message: `Network error: ${String(err)}`,
        link: { href: "https://tickets.kecktech.net/#user/new", label: "Create manually in Zammad" },
      });
    }

    // ── Step 4: ERPNext ────────────────────────────────────────────────
    setStep("erpnext", { status: "running", message: "Verifying ERPNext customer record…" });
    try {
      const res = await fetch(`/api/ops/onboard/erpnext?company=${encodeURIComponent(info.company)}`);
      const data = await res.json();
      if (data.error && !data.found) {
        setStep("erpnext", {
          status: "error",
          message: `ERPNext lookup failed: ${data.error}`,
          link: { href: "https://ops.kecktech.net/app/customer", label: "Open ERPNext Customers" },
        });
      } else if (!data.found) {
        setStep("erpnext", {
          status: "error",
          message: `No ERPNext Customer record found for "${info.company}". Create one before portal invoices will show.`,
          link: { href: data.erpNewUrl, label: `Create "${info.company}" in ERPNext` },
        });
      } else {
        setStep("erpnext", {
          status: "success",
          message: `Customer record "${data.customer?.customer_name}" confirmed in ERPNext.`,
        });
      }
    } catch (err) {
      setStep("erpnext", {
        status: "error",
        message: `Network error: ${String(err)}`,
        link: { href: "https://ops.kecktech.net/app/customer", label: "Open ERPNext Customers" },
      });
    }

    setRunning(false);
    setDone(true);
  };

  // Vaultwarden deep-link (pre-selected org vault)
  const vaultLink = `https://vault.kecktech.net/#/organizations`;
  const portalTestLink = `https://portal.kecktech.net`;

  const allSuccess =
    steps.lldap.status === "success" &&
    steps.zammad.status === "success" &&
    (steps.erpnext.status === "success" || steps.erpnext.status === "skipped");

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "32px 24px 48px",
        fontFamily: "'Inter', system-ui, sans-serif",
        color: "#e2e8f0",
      }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <a
            href="/ops"
            style={{ fontSize: "13px", color: "#64748b", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px", marginBottom: "12px" }}
          >
            ← Back to Ops
          </a>
          <h1 style={{ margin: "0 0 6px", fontSize: "24px", fontWeight: 700, color: "#f1f5f9" }}>
            Customer Onboarding Wizard
          </h1>
          <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
            Provisions an account across LLDAP, Zammad, and verifies ERPNext in one click.
          </p>
        </div>

        {/* ── Step 1: Customer Info ────────────────────────────────────── */}
        <StepCard number={1} title="Customer Information" status={running ? "running" : done ? "success" : "idle"}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <Field label="Full Name" hint="First + Last name">
              <input
                style={inputStyle}
                value={info.fullName}
                onChange={(e) => handleFullNameChange(e.target.value)}
                placeholder="Jane Smith"
                disabled={running}
              />
            </Field>
            <Field label="Company Name" hint="Exact match for Zammad org + ERPNext Customer">
              <input
                style={inputStyle}
                value={info.company}
                onChange={(e) => setInfo((p) => ({ ...p, company: e.target.value }))}
                placeholder="Smith Industries LLC"
                disabled={running}
              />
            </Field>
            <Field label="Email Address">
              <input
                style={inputStyle}
                type="email"
                value={info.email}
                onChange={(e) => setInfo((p) => ({ ...p, email: e.target.value }))}
                placeholder="jane@smithind.com"
                disabled={running}
              />
            </Field>
            <Field label="LLDAP Username" hint="Auto-derived — edit if needed">
              <input
                style={inputStyle}
                value={info.username}
                onChange={(e) => setInfo((p) => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") }))}
                placeholder="jane.smith"
                disabled={running}
              />
            </Field>
          </div>

          <Field label="Generated Password" hint="Store this — it will not be shown again after onboarding is complete">
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                style={{ ...inputStyle, fontFamily: "monospace", flex: 1 }}
                type={showPassword ? "text" : "password"}
                value={info.password}
                readOnly
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{ ...inputStyle, width: "auto", cursor: "pointer", flexShrink: 0 }}
                disabled={running}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
              <CopyButton text={info.password} />
              <button
                type="button"
                onClick={regeneratePassword}
                title="Generate a new password"
                style={{ ...inputStyle, width: "auto", cursor: "pointer", flexShrink: 0 }}
                disabled={running}
              >
                ↻
              </button>
            </div>
          </Field>
        </StepCard>

        {/* ── Step 2: LLDAP ────────────────────────────────────────────── */}
        <StepCard number={2} title="LLDAP — Create User + Add to kecktech_customers" status={steps.lldap.status}>
          <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#64748b" }}>
            Creates <code style={{ background: "#0f172a", padding: "1px 5px", borderRadius: "4px" }}>@{info.username || "username"}</code> in LLDAP and adds them to the <code style={{ background: "#0f172a", padding: "1px 5px", borderRadius: "4px" }}>kecktech_customers</code> group.
            This grants Authelia one-factor access to the Customer Portal.
          </p>
          <ResultRow result={steps.lldap} />
        </StepCard>

        {/* ── Step 3: Zammad ───────────────────────────────────────────── */}
        <StepCard number={3} title="Zammad — Create Customer Account" status={steps.zammad.status}>
          <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#64748b" }}>
            Creates a Customer-role user in Zammad matching the email address, and links them to the <strong style={{ color: "#94a3b8" }}>{info.company || "company"}</strong> organization if it exists.
          </p>
          <ResultRow result={steps.zammad} />
        </StepCard>

        {/* ── Step 4: ERPNext ──────────────────────────────────────────── */}
        <StepCard number={4} title="ERPNext — Verify Customer Record" status={steps.erpnext.status}>
          <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#64748b" }}>
            Checks that a Customer record named <strong style={{ color: "#94a3b8" }}>{info.company || "company"}</strong> exists in ERPNext.
            The portal uses this name to display invoices. If missing, a link is provided to create it.
          </p>
          <ResultRow result={steps.erpnext} />
        </StepCard>

        {/* ── Run Button ───────────────────────────────────────────────── */}
        {!done && (
          <button
            type="button"
            onClick={runOnboarding}
            disabled={!canRun || running}
            style={{
              width: "100%",
              padding: "14px",
              background: canRun && !running ? "#1d4ed8" : "#1e293b",
              border: "1px solid " + (canRun && !running ? "#3b82f6" : "#334155"),
              borderRadius: "8px",
              color: canRun && !running ? "#fff" : "#475569",
              fontSize: "15px",
              fontWeight: 700,
              cursor: canRun && !running ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              transition: "background 0.15s",
              marginBottom: "20px",
            }}
          >
            {running ? "Provisioning… please wait" : "Run Onboarding"}
          </button>
        )}

        {/* ── Step 5: Summary + Vaultwarden ───────────────────────────── */}
        {done && (
          <StepCard number={5} title="Summary + Next Steps" status={allSuccess ? "success" : "error"}>
            <div style={{ marginBottom: "16px" }}>
              {allSuccess ? (
                <p style={{ margin: "0 0 8px", color: "#86efac", fontSize: "14px", fontWeight: 600 }}>
                  Onboarding complete! All automated steps succeeded.
                </p>
              ) : (
                <p style={{ margin: "0 0 8px", color: "#fca5a5", fontSize: "14px", fontWeight: 600 }}>
                  Onboarding finished with errors. Review the failed steps above.
                </p>
              )}
            </div>

            {/* Password handoff */}
            <div style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "14px",
            }}>
              <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Customer Credentials — Store These Now
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", color: "#64748b", width: 80, flexShrink: 0 }}>Username</span>
                <code style={{ background: "#1e293b", padding: "3px 8px", borderRadius: "4px", fontSize: "13px", color: "#e2e8f0", flex: 1 }}>{info.username}</code>
                <CopyButton text={info.username} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <span style={{ fontSize: "13px", color: "#64748b", width: 80, flexShrink: 0 }}>Email</span>
                <code style={{ background: "#1e293b", padding: "3px 8px", borderRadius: "4px", fontSize: "13px", color: "#e2e8f0", flex: 1 }}>{info.email}</code>
                <CopyButton text={info.email} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px", color: "#64748b", width: 80, flexShrink: 0 }}>Password</span>
                <code style={{ background: "#1e293b", padding: "3px 8px", borderRadius: "4px", fontSize: "13px", color: "#fbbf24", flex: 1, fontFamily: "monospace" }}>{info.password}</code>
                <CopyButton text={info.password} />
              </div>
            </div>

            {/* Action links */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <a
                href={vaultLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 14px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: "inherit",
                  gap: "3px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>🔑 Vaultwarden</span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Add credentials to the {info.company} collection</span>
              </a>
              <a
                href={portalTestLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 14px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: "inherit",
                  gap: "3px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>👤 Test Portal</span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Log in as the new customer to verify access</span>
              </a>
              <a
                href="https://tickets.kecktech.net"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 14px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: "inherit",
                  gap: "3px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>🎧 Zammad</span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Verify customer record and org assignment</span>
              </a>
              <a
                href="https://ops.kecktech.net/app/customer"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 14px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  textDecoration: "none",
                  color: "inherit",
                  gap: "3px",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#e2e8f0" }}>📋 ERPNext</span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Verify invoices are linked to this customer</span>
              </a>
            </div>

            {/* Onboard another */}
            <button
              type="button"
              onClick={() => {
                setInfo({ fullName: "", firstName: "", lastName: "", email: "", company: "", username: "", password: generatePassword() });
                setSteps({ lldap: { status: "idle", message: "" }, zammad: { status: "idle", message: "" }, erpnext: { status: "idle", message: "" } });
                setDone(false);
                setShowPassword(false);
              }}
              style={{
                marginTop: "16px",
                width: "100%",
                padding: "10px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#94a3b8",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Onboard Another Customer
            </button>
          </StepCard>
        )}
      </div>
    </>
  );
}
