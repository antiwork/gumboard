const ORIGINAL_ENV = process.env;

describe("getStripe lazy loader", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("returns null/disabled when billing is off", async () => {
    process.env.NEXT_PUBLIC_ENABLE_STRIPE = "0";
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    const { getStripe } = await import("../stripe");
    expect(getStripe()).toBeNull(); // ← was toBeUndefined()
  });

  it("returns a Stripe instance when enabled with keys", async () => {
    process.env.NEXT_PUBLIC_ENABLE_STRIPE = "1";
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_dummy";

    const { getStripe } = await import("../stripe");
    expect(getStripe()).toBeTruthy();
  });
});
