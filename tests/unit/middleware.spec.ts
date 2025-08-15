import { NextRequest, NextResponse } from "next/server";
import { middleware } from "../../middleware";

// Mock NextResponse
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn(),
    next: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();
const mockedFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock console.error to avoid noise in test output
const consoleSpy = jest.spyOn(console, "error").mockImplementation();

describe("Middleware", () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock NextRequest
    mockRequest = {
      url: "https://example.com/api/boards/123",
      headers: new Map([["cookie", "session=test-session"]]),
    } as unknown as NextRequest;

    // Reset NextResponse mocks
    (NextResponse.json as jest.Mock).mockReturnValue("json-response");
    (NextResponse.next as jest.Mock).mockReturnValue("next-response");
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  describe("Successful authentication", () => {
    it("should continue with the request when user is authenticated", async () => {
      // Mock successful auth response
      mockedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          authenticated: true,
          user: { id: "user-1", email: "test@example.com" },
        }),
      } as Response);

      const result = await middleware(mockRequest);

      expect(mockedFetch).toHaveBeenCalledWith("https://example.com/api/auth/check", {
        headers: {
          cookie: "session=test-session",
        },
      });

      expect(NextResponse.next).toHaveBeenCalled();
      expect(result).toBe("next-response");
    });

    it("should handle requests without cookies", async () => {
      // Mock request without cookies
      const requestWithoutCookies = {
        url: "https://example.com/api/user/profile",
        headers: new Map(),
      } as unknown as NextRequest;

      mockedFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      await middleware(requestWithoutCookies);

      expect(mockedFetch).toHaveBeenCalledWith("https://example.com/api/auth/check", {
        headers: {
          cookie: "",
        },
      });
    });
  });

  describe("Failed authentication", () => {
    it("should return 401 when auth check returns not ok", async () => {
      mockedFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response);

      const result = await middleware(mockRequest);

      expect(NextResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" }, { status: 401 });
      expect(NextResponse.next).not.toHaveBeenCalled();
      expect(result).toBe("json-response");
    });
  });
});
