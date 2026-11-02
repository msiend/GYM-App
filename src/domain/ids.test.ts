import { describe, it, expect, vi, afterEach } from "vitest";
import { uid } from "./ids";
const nativeCrypto = globalThis.crypto;
afterEach(() => vi.unstubAllGlobals());
describe("record IDs on local-IP HTTP", () => {
  it("generates valid unique v4 identifiers without randomUUID", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: nativeCrypto.getRandomValues.bind(nativeCrypto),
    });
    const ids = Array.from({ length: 1000 }, () => uid());
    expect(new Set(ids).size).toBe(1000);
    expect(
      ids.every((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          id,
        ),
      ),
    ).toBe(true);
  });
  it("uses the native API when available", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "native-id" });
    expect(uid()).toBe("native-id");
  });
});
