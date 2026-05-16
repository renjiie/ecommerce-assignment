import type { Order } from "../types";

export const demoOrders: Order[] = [
  {
    id: "9b1d0bf5-9c5a-44fd-a789-d7897f4e1201",
    customer_id: "customer-1",
    status: "PENDING",
    total_amount: "124.90",
    created_at: "2026-05-15T08:42:00Z",
    updated_at: "2026-05-15T08:42:00Z",
    items: [
      {
        id: "line-1",
        product_id: "a56e9aa3-a647-44d7-87e6-102997528cfa",
        quantity: 2,
        unit_price: "49.95",
      },
      {
        id: "line-2",
        product_id: "bf873ff0-2bd5-4527-a420-f8d51209802c",
        quantity: 1,
        unit_price: "25.00",
      },
    ],
    status_history: [
      {
        id: "history-1",
        status: "PENDING",
        changed_by: "customer-1",
        created_at: "2026-05-15T08:42:00Z",
      },
    ],
  },
  {
    id: "676e19a6-f9f1-4f32-9bec-051de3249a99",
    customer_id: "customer-1",
    status: "PROCESSING",
    total_amount: "89.50",
    created_at: "2026-05-15T07:56:00Z",
    updated_at: "2026-05-15T08:01:00Z",
    items: [
      {
        id: "line-3",
        product_id: "1dc821f8-cd28-439b-9098-b427d58f6107",
        quantity: 1,
        unit_price: "89.50",
      },
    ],
    status_history: [
      {
        id: "history-2",
        status: "PENDING",
        changed_by: "customer-1",
        created_at: "2026-05-15T07:56:00Z",
      },
      {
        id: "history-3",
        status: "PROCESSING",
        changed_by: "system",
        created_at: "2026-05-15T08:01:00Z",
      },
    ],
  },
  {
    id: "fabf3d4b-71b6-4e8a-a31f-a523f660e024",
    customer_id: "customer-2",
    status: "SHIPPED",
    total_amount: "312.10",
    created_at: "2026-05-14T17:20:00Z",
    updated_at: "2026-05-15T04:15:00Z",
    items: [
      {
        id: "line-4",
        product_id: "30d0a8d2-a358-4b0e-84b9-c9cb7e7299db",
        quantity: 4,
        unit_price: "78.03",
      },
    ],
    status_history: [
      {
        id: "history-4",
        status: "PENDING",
        changed_by: "customer-2",
        created_at: "2026-05-14T17:20:00Z",
      },
      {
        id: "history-5",
        status: "PROCESSING",
        changed_by: "admin-1",
        created_at: "2026-05-14T17:31:00Z",
      },
      {
        id: "history-6",
        status: "SHIPPED",
        changed_by: "admin-1",
        created_at: "2026-05-15T04:15:00Z",
      },
    ],
  },
  {
    id: "cfedbfdd-a275-4a20-8f70-f7e34ab377e2",
    customer_id: "customer-3",
    status: "DELIVERED",
    total_amount: "42.00",
    created_at: "2026-05-13T12:16:00Z",
    updated_at: "2026-05-14T12:03:00Z",
    items: [
      {
        id: "line-5",
        product_id: "d563e27f-3f4d-47ce-a410-dbce3d45ea74",
        quantity: 3,
        unit_price: "14.00",
      },
    ],
    status_history: [
      {
        id: "history-7",
        status: "DELIVERED",
        changed_by: "admin-1",
        created_at: "2026-05-14T12:03:00Z",
      },
    ],
  },
  {
    id: "35ff1114-a8fd-49a4-b9a4-d76cfd495859",
    customer_id: "customer-1",
    status: "CANCELLED",
    total_amount: "59.00",
    created_at: "2026-05-12T08:03:00Z",
    updated_at: "2026-05-12T08:05:00Z",
    items: [
      {
        id: "line-6",
        product_id: "f8f9b5e3-70a4-4f0b-a3c2-ceba50819b5b",
        quantity: 1,
        unit_price: "59.00",
      },
    ],
    status_history: [
      {
        id: "history-8",
        status: "CANCELLED",
        changed_by: "customer-1",
        created_at: "2026-05-12T08:05:00Z",
      },
    ],
  },
];

