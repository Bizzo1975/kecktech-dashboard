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

function ClientCard() {
  return (
    <div
      style={{
        background: "#1e293b",
        border: "1px solid #334155",
        borderRadius: "10px",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <Skeleton w="140px" h="16px" />
        <Skeleton w="60px" h="20px" />
      </div>
      {[1, 2].map((i) => (
        <div
          key={i}
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "6px",
            padding: "8px 12px",
            marginBottom: "6px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ flex: 1 }}>
            <Skeleton w="60%" h="13px" />
            <div style={{ marginTop: "4px" }}>
              <Skeleton w="40%" h="11px" />
            </div>
          </div>
          <Skeleton w="50px" h="20px" />
        </div>
      ))}
    </div>
  );
}

export default function OpsLoading() {
  return (
    <div style={{ padding: "28px 32px", maxWidth: "1400px", margin: "0 auto" }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <Skeleton w="200px" h="28px" />
      <div style={{ marginTop: "6px", marginBottom: "24px" }}>
        <Skeleton w="300px" h="14px" />
      </div>

      {/* Alert summary bar */}
      <div
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "10px",
          padding: "14px 20px",
          display: "flex",
          gap: "24px",
          marginBottom: "28px",
          alignItems: "center",
        }}
      >
        <Skeleton w="120px" h="14px" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Skeleton w="12px" h="12px" />
            <Skeleton w="60px" h="13px" />
          </div>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <Skeleton w="100px" h="13px" />
        </div>
      </div>

      {/* Stack status */}
      <div style={{ marginBottom: "32px" }}>
        <Skeleton w="150px" h="20px" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "10px",
            marginTop: "14px",
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div
              key={i}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Skeleton w="10px" h="10px" />
              <div style={{ flex: 1 }}>
                <Skeleton w="80%" h="13px" />
                <div style={{ marginTop: "4px" }}>
                  <Skeleton w="50%" h="11px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Client grid */}
      <div>
        <Skeleton w="180px" h="20px" />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "16px",
            marginTop: "14px",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <ClientCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
