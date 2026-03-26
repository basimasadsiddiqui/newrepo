export default function Loading() {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#FAF6F1", // var(--cream-light)
            color: "#5C0A0A",      // var(--maroon)
            fontFamily: "system-ui, sans-serif",
            flexDirection: "column",
            gap: "16px"
        }}>
            <div style={{
                width: "40px",
                height: "40px",
                border: "4px solid #E6D4A8", // var(--gold-light)
                borderTopColor: "#5C0A0A",   // var(--maroon)
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
            }} />
            <div style={{ fontWeight: 600 }}>Loading Akhtar Jewellers ERP...</div>
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}
