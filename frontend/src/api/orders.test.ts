import { beforeEach, describe, expect, it, vi } from "vitest";

import { configureApiAuth, fetchOrders, updateOrderStatus } from "./orders";

describe("orders API auth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends dev bypass headers when auth bypass is enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, page_size: 100 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    configureApiAuth({
      authBypass: true,
      reviewerRoleSwitchEnabled: false,
      role: "ADMIN",
      userId: "admin-1",
      userLabel: "admin@example.com",
      getToken: async () => null,
    });

    await updateOrderStatus("order-1", "PROCESSING");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/orders/order-1/status",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Dev-Role": "ADMIN",
          "X-Dev-User-Id": "admin-1",
          "X-Dev-Email": "admin@example.com",
        }),
      }),
    );
  });

  it("sends a Clerk bearer token when auth bypass is disabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, page_size: 100 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    configureApiAuth({
      authBypass: false,
      reviewerRoleSwitchEnabled: false,
      role: "CUSTOMER",
      userId: "customer-1",
      userLabel: "customer@example.com",
      getToken: async () => "clerk-token",
    });

    await fetchOrders();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/orders?page=1&page_size=100",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer clerk-token",
        }),
      }),
    );
  });

  it("keeps the Clerk token and sends reviewer override headers when enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0, page: 1, page_size: 100 }),
    });
    vi.stubGlobal("fetch", fetchMock);
    configureApiAuth({
      authBypass: false,
      reviewerRoleSwitchEnabled: true,
      role: "ADMIN",
      userId: "user_123",
      userLabel: "reviewer@example.com",
      getToken: async () => "clerk-token",
    });

    await fetchOrders();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/orders?page=1&page_size=100",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer clerk-token",
          "X-Reviewer-Role": "ADMIN",
          "X-Dev-Role": "ADMIN",
          "X-Dev-User-Id": "user_123",
          "X-Dev-Email": "reviewer@example.com",
        }),
      }),
    );
  });
});
