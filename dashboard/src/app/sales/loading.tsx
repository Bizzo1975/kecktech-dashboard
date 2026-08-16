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

function KanbanColumn() {
  return (
    <div
      style={{
        minWidth: "180px",
        flex: "0 0 auto",
        background: "#1e293b",
        border: "1px solid #334155",
        borderTop: "3px solid #334155",
        borderRadius: "10px",
        padding: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <Skeleton w="70px" h="14px" />
        <Skeleton w="24px" h="18px" />
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "6px",
            padding: "10px",
            marginBottom: "6px",
          }}
        >
          <Skeleton w="80%" h="13px" />
          <div style={{ marginTop: "6px" }}>
            <Skeleton w="60%" h="11px" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
            <Skeleton w="50px" h="14px" />
            <Skeleton w="20px" h="11px" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SalesLoading() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: "1600px", margin: "0 auto" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <Skeleton w="160px" h="28px" />
      <div style={{ marginTop: "6px", marginBottom: "24px" }}>
        <Skeleton w="280px" h="14px" />
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "28px", flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "16px 20px",
              flex: 1,
              minWidth: "120px",
            }}
          >
            <Skeleton w="90px" h="11px" />
            <div style={{ marginTop: "10px" }}>
              <Skeleton w="60px" h="26px" />
            </div>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div style={{ marginBottom: "32px" }}>
        <Skeleton w="140px" h="20px" />
        <div style={{ display: "flex", gap: "10px", marginTop: "14px", overflowX: "auto", paddingBottom: "8px" }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <KanbanColumn key={i} />
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px" }}>
        {/* Follow-up queue */}
        <div>
          <Skeleton w="180px" h="20px" />
          <div style={{ marginTop: "14px" }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderLeft: "4px solid #334155",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <Skeleton w="50%" h="14px" />
                  <div style={{ marginTop: "6px" }}>
                    <Skeleton w="35%" h="12px" />
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                    <Skeleton w="60px" h="14px" />
                    <Skeleton w="50px" h="14px" />
                    <Skeleton w="80px" h="14px" />
                  </div>
                </div>
                <Skeleton w="90px" h="28px" />
              </div>
            ))}
          </div>
        </div>

        {/* New lead form */}
        <div>
          <Skeleton w="100px" h="20px" />
          <div
            style={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "20px",
              marginTop: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} h="36px" />
            ))}
            <Skeleton h="40px" />
          </div>
        </div>
      </div>
    </div>
  );
}
