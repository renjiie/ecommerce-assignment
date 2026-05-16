import { describe, expect, it } from "vitest";

import type { Order, OrderStatus } from "../types";
import {
  calculateOrderMetrics,
  formatCurrency,
  getNextStatuses,
  sortOrdersForOperations,
} from "./orderUtils";

const baseOrder = (status: OrderStatus, totalAmount: string, createdAt: string): Order => ({
  id: `${status}-${createdAt}`,
  customer_id: "customer-1",
  status,
  total_amount: totalAmount,
  items: [],
  status_history: [],
  created_at: createdAt,
  updated_at: createdAt,
});

describe("order utilities", () => {
  it("calculates operational metrics by status and revenue", () => {
    const metrics = calculateOrderMetrics([
      baseOrder("PENDING", "24.25", "2026-05-15T08:00:00Z"),
      baseOrder("PROCESSING", "10.00", "2026-05-15T08:01:00Z"),
      baseOrder("DELIVERED", "40.00", "2026-05-15T08:02:00Z"),
    ]);

    expect(metrics.totalOrders).toBe(3);
    expect(metrics.pending).toBe(1);
    expect(metrics.processing).toBe(1);
    expect(metrics.delivered).toBe(1);
    expect(metrics.revenue).toBe(74.25);
  });

  it("returns valid next statuses for admin transitions", () => {
    expect(getNextStatuses("PENDING")).toEqual(["PROCESSING", "CANCELLED"]);
    expect(getNextStatuses("PROCESSING")).toEqual(["SHIPPED"]);
    expect(getNextStatuses("DELIVERED")).toEqual([]);
  });

  it("sorts active orders before terminal orders with newest first", () => {
    const sorted = sortOrdersForOperations([
      baseOrder("DELIVERED", "20.00", "2026-05-15T08:00:00Z"),
      baseOrder("PENDING", "20.00", "2026-05-15T08:01:00Z"),
      baseOrder("PROCESSING", "20.00", "2026-05-15T08:02:00Z"),
    ]);

    expect(sorted.map((order) => order.status)).toEqual(["PROCESSING", "PENDING", "DELIVERED"]);
  });

  it("formats revenue consistently", () => {
    expect(formatCurrency(74.25)).toBe("$74.25");
  });
});

