import type {
  AuthContextValue,
  CreateOrderPayload,
  Order,
  OrderListResponse,
  OrderStatus,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type ApiAuthState = Pick<
  AuthContextValue,
  "authBypass" | "getToken" | "reviewerRoleSwitchEnabled" | "role" | "userId" | "userLabel"
>;

let apiAuthState: ApiAuthState = {
  authBypass: import.meta.env.VITE_AUTH_BYPASS !== "false",
  reviewerRoleSwitchEnabled: false,
  role: "CUSTOMER",
  userId: "dev-user",
  userLabel: "dev@local.dev",
  getToken: async () => null,
};

export function configureApiAuth(authState: ApiAuthState): void {
  apiAuthState = authState;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (apiAuthState.authBypass) {
    return {
      "X-Dev-Role": apiAuthState.role,
      "X-Dev-User-Id": apiAuthState.userId,
      "X-Dev-Email": apiAuthState.userLabel,
    };
  }

  const token = await apiAuthState.getToken();
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  if (apiAuthState.reviewerRoleSwitchEnabled) {
    headers["X-Reviewer-Role"] = apiAuthState.role;
    headers["X-Dev-Role"] = apiAuthState.role;
    headers["X-Dev-User-Id"] = apiAuthState.userId;
    headers["X-Dev-Email"] = apiAuthState.userLabel;
  }
  return headers;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    const message = body?.error?.message ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchOrders(status?: OrderStatus): Promise<OrderListResponse> {
  const params = new URLSearchParams({ page: "1", page_size: "100" });
  if (status) params.set("status", status);
  return request<OrderListResponse>(`/api/v1/orders?${params.toString()}`);
}

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return request<Order>("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function cancelOrder(orderId: string): Promise<Order> {
  return request<Order>(`/api/v1/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
  return request<Order>(`/api/v1/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
