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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "10px",
        padding: "14px",
        marginBottom: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {children}
    </div>
  );
}

export default function SupportLoading() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: "1600px", margin: "0 auto" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <Skeleton w="200px" h="28px" />
      <div style={{ marginTop: "6px", marginBottom: "24px" }}>
        <Skeleton w="300px" h="14px" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 4.5fr 2.5fr", gap: "20px" }}>
        {/* Alerts column */}
        <div>
          <Skeleton w="100px" h="18px" />
          <div style={{ marginTop: "12px" }}>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Skeleton w="120px" />
                  <Skeleton w="60px" />
                </div>
                <Skeleton w="80%" h="12px" />
                <Skeleton w="50%" h="11px" />
              </Card>
            ))}
          </div>
        </div>

        {/* Tickets column */}
        <div>
          <Skeleton w="140px" h="18px" />
          <div style={{ marginTop: "12px" }}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Skeleton w="200px" h="14px" />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <Skeleton w="50px" />
                    <Skeleton w="50px" />
                  </div>
                </div>
                <Skeleton w="60%" h="12px" />
              </Card>
            ))}
          </div>
        </div>

        {/* Quick actions column */}
        <div>
          <Card>
            <Skeleton w="80px" h="16px" />
            <Skeleton h="32px" />
            <Skeleton h="32px" />
            <Skeleton h="32px" />
            <Skeleton h="32px" />
            <Skeleton h="32px" />
          </Card>
          <Card>
            <Skeleton w="100px" h="16px" />
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h="34px" />)}
          </Card>
        </div>
      </div>
    </div>
  );
}
