import {
  getSessionCookieNames,
  getSessionTokenFromCookieHeader,
  hasSessionCookieHeader,
} from "@/lib/auth/session-cookie";

describe("Better Auth session cookies", () => {
  afterEach(() => {
    delete process.env.BETTER_AUTH_COOKIE_PREFIX;
  });

  it.each([
    "better-auth.session_token=token",
    "__Secure-better-auth.session_token=token",
    "better-auth.session_data=data",
    "__Secure-better-auth.session_data=data",
    "better_auth.session_token=legacy-token",
    "better_auth.session_data=legacy-data",
  ])("recognizes %s in the proxy", (cookie) => {
    expect(hasSessionCookieHeader(cookie)).toBe(true);
  });

  it("uses the same configured prefix for detection and cache keys", () => {
    process.env.BETTER_AUTH_COOKIE_PREFIX = "boutiq";

    expect(getSessionCookieNames()).toEqual([
      "boutiq.session_token",
      "__Secure-boutiq.session_token",
      "boutiq.session_data",
      "__Secure-boutiq.session_data",
    ]);
    expect(hasSessionCookieHeader("__Secure-boutiq.session_token=token")).toBe(
      true,
    );
    expect(
      getSessionTokenFromCookieHeader("__Secure-boutiq.session_token=token"),
    ).toBe("token");
  });

  it("does not match a similarly named cookie", () => {
    expect(hasSessionCookieHeader("not-better-auth.session_token=token")).toBe(
      false,
    );
    expect(
      getSessionTokenFromCookieHeader("not-better-auth.session_token=token"),
    ).toBeNull();
  });
});
