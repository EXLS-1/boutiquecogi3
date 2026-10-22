const fetchMock = vi.fn();

const payload = {
  to: "new-user@example.com",
  subject: "Verify your email",
  html: "<p>Verify your email</p>",
};

describe("Resend email service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("MAIL_FROM", "Boutiquecogi3 <verified@example.com>");
    vi.stubEnv("FROM_EMAIL", "legacy@example.com");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends with the configured verified sender", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const { sendEmail } = await import("@/lib/email");

    await expect(sendEmail(payload)).resolves.toBe(true);

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body).from).toBe(
      "Boutiquecogi3 <verified@example.com>",
    );
    expect(request.headers.Authorization).toBe("Bearer re_test_key");
  });

  it("reports Resend rejections instead of treating them as sent", async () => {
    fetchMock.mockResolvedValue(
      new Response("sender domain is not verified", { status: 422 }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email");

    await expect(sendEmail(payload)).resolves.toBe(false);
  });

  it("reports a missing API key as an unsuccessful send", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email");

    await expect(sendEmail(payload)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a public mailbox as the Resend sender", async () => {
    vi.stubEnv("MAIL_FROM", "Excellentservice1 <excellentservice1exls@gmail.com>");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email");

    await expect(sendEmail(payload)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
