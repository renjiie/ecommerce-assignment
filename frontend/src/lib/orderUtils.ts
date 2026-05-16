import type { Order, OrderStatus } from "../types";

export type OrderMetrics = {
  totalOrders: number;
  revenue: number;
  pending: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

const statusPriority: Record<OrderStatus, number> = {
  PROCESSING: 0,
  PENDING: 1,
  SHIPPED: 2,
  DELIVERED: 3,
  CANCELLED: 4,
};

const transitionMap: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export function getNextStatuses(status: OrderStatus): OrderStatus[] {
  return transitionMap[status];
}

export function calculateOrderMetrics(orders: Order[]): OrderMetrics {
  return orders.reduce<OrderMetrics>(
    (metrics, order) => {
      metrics.totalOrders += 1;
      metrics.revenue += Number(order.total_amount);
      const key = order.status.toLowerCase() as Lowercase<OrderStatus>;
      metrics[key] += 1;
      return metrics;
    },
    {
      totalOrders: 0,
      revenue: 0,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    },
  );
}

export function sortOrdersForOperations(orders: Order[]): Order[] {
  return [...orders].sort((left, right) => {
    const statusDelta = statusPriority[left.status] - statusPriority[right.status];
    if (statusDelta !== 0) return statusDelta;
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}

export function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function shortId(value: string): string {
  return value.slice(0, 8);
}

export function matchesOrderSearch(order: Order, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [order.id, order.customer_id, order.status]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

