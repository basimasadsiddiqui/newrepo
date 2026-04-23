"use client";

type MetalTypeDisplay = {
    id: string;
    name: string;
    purity: string;
    purityValue: number;
    isActive: boolean;
    createdAt: Date;
};

const METAL_ICONS: Record<string, string> = {
    gold: "🥇",
    silver: "🥈",
    platinum: "⬜",
    diamond: "💎",
    copper: "🟤",
    bronze: "🟠",
};

function getMetalIcon(name: string): string {
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(METAL_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return "🔘";
}

function getPurityColor(purityValue: number): string {
    if (purityValue >= 0.999) return "var(--gold)";
    if (purityValue >= 0.9167) return "#FFD700";
    if (purityValue >= 0.875) return "#F0C040";
    if (purityValue >= 0.75) return "#E0AA30";
    if (purityValue >= 0.585) return "#C89020";
    return "var(--text-muted)";
}

export default function MetalTypesManager({ metalTypes }: { metalTypes: MetalTypeDisplay[] }) {
    const grouped = metalTypes.reduce<Record<string, MetalTypeDisplay[]>>((acc, mt) => {
        const base = mt.name.split(" ")[0];
        if (!acc[base]) acc[base] = [];
        acc[base].push(mt);
        return acc;
    }, {});

    return (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {Object.entries(grouped).map(([baseType, items]) => (
                <div key={baseType} className="card">
                    <div className="card-header">
                        <h3>
                            {getMetalIcon(baseType)} {baseType}
                            <span style={{ marginLeft: "8px", fontWeight: 400, opacity: 0.6, textTransform: "lowercase", letterSpacing: "0" }}>
                                {items.length} variant{items.length !== 1 ? "s" : ""}
                            </span>
                        </h3>
                    </div>
                    <div className="card-body" style={{ padding: "8px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
                            {items.map((mt) => (
                                <div
                                    key={mt.id}
                                    style={{
                                        padding: "12px",
                                        borderRadius: "var(--radius-sm)",
                                        border: "1px solid var(--border)",
                                        background: mt.isActive ? "white" : "var(--cream-light)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                        transition: "all var(--transition-fast)",
                                        position: "relative",
                                        overflow: "hidden",
                                    }}
                                >
                                    {/* Purity bar */}
                                    <div style={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: "3px",
                                        background: `linear-gradient(90deg, ${getPurityColor(mt.purityValue)} 0%, transparent 100%)`,
                                    }} />

                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                        <span style={{
                                            fontSize: "0.875rem",
                                            fontWeight: 700,
                                            color: "var(--text-primary)",
                                        }}>
                                            {mt.name}
                                        </span>
                                        <span className={`badge ${mt.isActive ? "badge-active" : "badge-inactive"}`}>
                                            {mt.isActive ? "Active" : "Off"}
                                        </span>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", fontWeight: 500 }}>Purity:</span>
                                        <span style={{
                                            fontSize: "0.75rem",
                                            fontWeight: 700,
                                            fontFamily: "var(--font-mono)",
                                            color: getPurityColor(mt.purityValue),
                                        }}>
                                            {mt.purity}
                                        </span>
                                    </div>

                                    {mt.purityValue > 0 && (
                                        <div style={{
                                            height: "4px",
                                            borderRadius: "4px",
                                            background: "var(--cream)",
                                            overflow: "hidden",
                                        }}>
                                            <div style={{
                                                height: "100%",
                                                width: `${Math.min(100, mt.purityValue * 100)}%`,
                                                background: `linear-gradient(90deg, ${getPurityColor(mt.purityValue)} 0%, ${getPurityColor(mt.purityValue)}aa 100%)`,
                                                borderRadius: "4px",
                                                transition: "width 1s ease",
                                            }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}

            {metalTypes.length === 0 && (
                <div style={{
                    textAlign: "center",
                    padding: "48px 24px",
                    color: "var(--text-muted)",
                    background: "var(--surface-2)",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border-strong)",
                }}>
                    <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔘</div>
                    <div style={{ fontWeight: 600, marginBottom: "6px" }}>No metal types configured</div>
                    <div style={{ fontSize: "0.8125rem" }}>Metal types are created during the initial system setup.</div>
                </div>
            )}
        </div>
    );
}
