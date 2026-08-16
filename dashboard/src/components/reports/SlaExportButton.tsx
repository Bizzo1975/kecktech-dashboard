"use client";

type SlaRow = {
  client: string;
  ticketCount: number;
  slaMet: number;
  slaBreached: number;
  compliancePct: number;
  avgResolutionHours: number;
};

export function SlaExportButton({ rows, month }: { rows: SlaRow[]; month: string }) {
  function handleExport() {
    const header = "Client,Tickets,SLA Met,SLA Breached,Compliance %,Avg Resolution (hrs)";
    const lines = rows.map((r) =>
      [r.client, r.ticketCount, r.slaMet, r.slaBreached, r.compliancePct.toFixed(1), r.avgResolutionHours.toFixed(1)].join(",")
    );
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sla-report-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      style={{
        background: "#C07810",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        padding: "7px 16px",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      ⬇ Export CSV
    </button>
  );
}
