function Skeleton({ w, h }: { w?: string; h?: string }) {
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: "6px",
        width: w || "100%",
        height: h || "16px",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

function TableRow() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 80px 90px 90px 70px",
        gap: "12px",
        padding: "10px 0",
        borderBottom: "1px solid #1e293b",
        alignItems: "center",
      }}
    >
      <Skeleton h="13px" />
      <Skeleton w="70%" h="13px" />
      <Skeleton h="13px" />
      <Skeleton h="13px" />
      <Skeleton h="13px" />
      <Skeleton w="50px" h="20px" />
    </div>
  );
}

export default function BillingLoading() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: "1600px", margin: "0 auto" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <Skeleton w="180px" h="28px" />
      <div style={{ marginTop: "6px", marginBottom: "24px" }}>
        <Skeleton w="320px" h="14px" />
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "32px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "18px 20px",
              flex: 1,
            }}
          >
            <Skeleton w="80px" h="11px" />
            <div style={{ marginTop: "10px" }}>
              <Skeleton w="100px" h="28px" />
            </div>
            <div style={{ marginTop: "6px" }}>
              <Skeleton w="120px" h="12px" />
            </div>
          </div>
        ))}
      </div>

      {/* AR Invoices section */}
      <div style={{ marginBottom: "32px" }}>
        <Skeleton w="220px" h="20px" />
        <div
          style={{
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "10px",
            padding: "16px 20px",
            marginTop: "14px",
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i} />
          ))}
        </div>
      </div>

      {/* Bottom row: AP + Timesheets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div>
          <Skeleton w="200px" h="20px" />
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "16px 20px",
              marginTop: "14px",
            }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #0f172a", display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <Skeleton w="60%" h="13px" />
                <Skeleton w="80px" h="13px" />
              </div>
            ))}
          </div>
        </div>

        <div>
          <Skeleton w="180px" h="20px" />
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "16px 20px",
              marginTop: "14px",
            }}
          >
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid #0f172a", display: "flex", justifyContent: "space-between", gap: "12px" }}>
                <Skeleton w="55%" h="13px" />
                <Skeleton w="60px" h="13px" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
