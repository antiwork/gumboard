import "@testing-library/jest-dom";

// Minimal, explicit Stripe mock (no network, no secrets)
jest.mock("stripe", () => {
  const mock = jest.fn().mockImplementation(() => ({
    customers: { create: jest.fn().mockResolvedValue({ id: "cus_test" }) },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: "cs_test", url: "https://stripe.test/checkout" }),
        retrieve: jest.fn().mockResolvedValue({
          id: "cs_test",
          client_reference_id: "org_123",
          subscription: "sub_123",
          customer: "cus_test",
        }),
      },
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({
        id: "evt_test",
        type: "checkout.session.completed",
        data: { object: { id: "cs_test" } },
      }),
    },
    subscriptions: { retrieve: jest.fn().mockResolvedValue({ id: "sub_123", status: "active" }) },
  }));
  return { __esModule: true, default: mock };
});