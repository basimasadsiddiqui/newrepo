/**
 * Thin server-side endpoint that executes a single ERP agent tool.
 * Called by the client-side Puter.js agent loop after Puter decides which tool to use.
 * This keeps DB credentials server-side while letting the LLM reasoning happen in the browser.
 */
import { NextRequest, NextResponse } from "next/server";
import { executeTool, ALL_TOOLS } from "@/lib/agent-tools";

const ALLOWED_READ_TOOLS = ALL_TOOLS
    .filter((t) => !t.requiresConfirmation)
    .map((t) => t.name);

export async function POST(req: NextRequest) {
    try {
        const { tool, input } = await req.json() as {
            tool: string;
            input: Record<string, unknown>;
        };

        if (!tool) {
            return NextResponse.json({ success: false, error: "tool name required" }, { status: 400 });
        }

        // Only allow read tools from the browser — write tools still require confirmation via /agent
        if (!ALLOWED_READ_TOOLS.includes(tool)) {
            return NextResponse.json(
                { success: false, error: `Tool "${tool}" requires server-side confirmation` },
                { status: 403 }
            );
        }

        const result = await executeTool(tool, input ?? {});
        return NextResponse.json({ success: true, result });
    } catch (err) {
        console.error("tool-exec error:", err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Tool execution failed" },
            { status: 500 }
        );
    }
}
