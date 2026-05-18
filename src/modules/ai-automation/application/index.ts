// AI Automation module — application layer public API.
// Complex provider/agent files (ai-agent, ai-providers, ai-key-manager, tts-manager)
// remain in lib/ and are accessed via backward-compat bridges.
// This establishes the module boundary for new code.
export * from "./quotaError";
