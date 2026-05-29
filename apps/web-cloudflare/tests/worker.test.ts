import { describe, expect, it, vi } from "vitest";

import app from "../src/worker";

describe("worker error handling", () => {
  it("does not leak internal error messages in 500 responses", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await app.request(
      new Request("https://example.com/api/media/images/base64", {
        method: "POST",
        headers: {
          Authorization: "Bearer broken-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName: "a.png", base64Data: "aGVsbG8=" }),
      }),
      {
        DB: {} as D1Database,
        MEDIA: {} as R2Bucket,
        ASSETS: { fetch: vi.fn() } as Fetcher,
        JWT_SECRET: "short",
        ALLOW_REGISTRATION: "false",
        ACCESS_TOKEN_TTL_SECONDS: "86400",
      },
    );

    const body = await response.json() as { error: { code: string; message: string } };

    expect(response.status).toBe(401);
    expect(body.error.message).toBe("Invalid or expired access token");

    errorSpy.mockRestore();
  });
});
