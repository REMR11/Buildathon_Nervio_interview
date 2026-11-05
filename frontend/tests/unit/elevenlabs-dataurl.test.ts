import { afterEach, describe, expect, it, vi } from "vitest";
import {
  arrayBufferToDataUrl,
  arrayBufferToDataUrlNode,
  synthesizeSpeech,
} from "@/lib/interview/elevenlabs";

describe("arrayBufferToDataUrl(Node)", () => {
  it("codifica el buffer en data URL", () => {
    const buffer = new Uint8Array([1, 2, 3]).buffer;
    const node = arrayBufferToDataUrlNode(buffer, "audio/mpeg");
    const browser = arrayBufferToDataUrl(buffer, "audio/mpeg");
    expect(node).toBe(browser);
    expect(node.startsWith("data:audio/mpeg;base64,")).toBe(true);
  });
});

describe("synthesizeSpeech", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("exige API key y voice id", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    vi.stubEnv("ELEVENLABS_VOICE_ID", "");
    await expect(synthesizeSpeech("hola")).rejects.toThrow(/no configuradas/);
  });

  it("no llama a ElevenLabs de verdad: usa fetch mockeado", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("ELEVENLABS_VOICE_ID", "voice-1");
    const fetchMock = vi.fn(async () => new Response("abc", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const audio = await synthesizeSpeech("hola", "es");
    expect(Buffer.from(audio).toString()).toBe("abc");
    expect(fetchMock).toHaveBeenCalled();
    const calledUrl = String(fetchMock.mock.calls.at(0)?.at(0) ?? "");
    expect(calledUrl).toContain("elevenlabs.io");
  });

  it("propaga un error HTTP", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "test-key");
    vi.stubEnv("ELEVENLABS_VOICE_ID", "voice-1");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 401 })),
    );
    await expect(synthesizeSpeech("hola")).rejects.toThrow(/401/);
  });
});
