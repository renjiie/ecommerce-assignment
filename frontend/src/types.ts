export type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

export type UserRole = "CUSTOMER" | "ADMIN";

export type AuthContextValue = {
  authBypass: boolean;
  reviewerRoleSwitchEnabled: boolean;
  reviewerUserId?: string;
  role: UserRole;
  userId: string;
  userLabel: string;
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  setRole: (role: UserRole) => void;
  signOut?: () => void;
};

export type OrderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
};

export type OrderStatusHistory = {
  id: string;
  status: OrderStatus;
  changed_by: string;
  created_at: string;
};

export type Order = {
  id: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: string;
  items: OrderItem[];
  status_history: OrderStatusHistory[];
  created_at: string;
  updated_at: string;
};

export type OrderListResponse = {
  items: Order[];
  total: number;
  page: number;
  page_size: number;
};

export type CreateOrderPayload = {
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: string;
  }>;
};

export type ApiErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
};
