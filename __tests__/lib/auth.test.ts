import { authOptions } from "@/lib/auth";

describe("authOptions", () => {
  it("uses the homepage as the NextAuth sign-in page", () => {
    expect(authOptions.pages?.signIn).toBe("/");
  });
});
