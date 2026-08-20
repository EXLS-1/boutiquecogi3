import {
  hasPublicSignupPrivilegeFields,
  publicSignupSchema,
} from "@/lib/auth/public-signup-schema";

const validSignup = {
  name: "Public User",
  email: "public@example.com",
  password: "correct horse battery staple",
};

describe("public signup privilege fields", () => {
  it.each([
    ["role", "SUPER_ADMIN"],
    ["level", 1],
    ["role", null],
    ["level", 0],
    ["role", ""],
  ])("rejects a supplied %s field", (field, value) => {
    const result = publicSignupSchema.safeParse({
      ...validSignup,
      [field]: value,
    });

    expect(result.success).toBe(false);
    expect(hasPublicSignupPrivilegeFields({ [field]: value })).toBe(true);
  });

  it("accepts a public signup without privilege fields", () => {
    expect(publicSignupSchema.safeParse(validSignup).success).toBe(true);
    expect(hasPublicSignupPrivilegeFields(validSignup)).toBe(false);
  });
});