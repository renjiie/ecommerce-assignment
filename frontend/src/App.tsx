import { zodResolver } from "@hookform/resolvers/zod";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Layers3,
  Loader2,
  PackageCheck,
  PanelRightOpen,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  SlidersHorizontal,
  Sparkles,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { cancelOrder, configureApiAuth, createOrder, fetchOrders, updateOrderStatus } from "./api/orders";
import { ClerkUserControl } from "./auth/AuthProvider";
import { useOrderAuth } from "./auth/authContext";
import { demoOrders } from "./data/demoOrders";
import {
  calculateOrderMetrics,
  formatCurrency,
  formatShortDate,
  getNextStatuses,
  matchesOrderSearch,
  shortId,
  sortOrdersForOperations,
  statusLabels,
} from "./lib/orderUtils";
import type { AuthContextValue, Order, OrderStatus, UserRole } from "./types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const orderStatuses: OrderStatus[] = [
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const statusIcon = {
  PENDING: Clock3,
  PROCESSING: Activity,
  SHIPPED: Truck,
  DELIVERED: CheckCircle2,
  CANCELLED: XCircle,
} satisfies Record<OrderStatus, typeof Clock3>;

const orderFormSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid("Use a valid product UUID"),
        quantity: z.coerce.number().int().positive("Quantity must be greater than zero"),
        unit_price: z.coerce.number().positive("Price must be greater than zero"),
      }),
    )
    .min(1, "Add at least one item"),
});

type OrderFormInput = z.input<typeof orderFormSchema>;
type OrderFormValues = z.output<typeof orderFormSchema>;

function AppShell() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const auth = useOrderAuth();
  const { role } = auth;

  configureApiAuth(auth);

  const ordersQuery = useQuery({
    queryKey: ["orders", role, auth.userId, auth.reviewerUserId, auth.authBypass],
    queryFn: () => fetchOrders(),
    placeholderData: { items: demoOrders, total: demoOrders.length, page: 1, page_size: 100 },
    enabled: auth.isLoaded && auth.isSignedIn,
  });

  const isDemoMode = ordersQuery.isError;
  const orders = useMemo(
    () => (isDemoMode ? demoOrders : (ordersQuery.data?.items ?? [])),
    [isDemoMode, ordersQuery.data?.items],
  );
  const metrics = calculateOrderMetrics(orders);

  const filteredOrders = useMemo(() => {
    const byStatus =
      statusFilter === "ALL" ? orders : orders.filter((order) => order.status === statusFilter);
    const normalizedSearch = search.trim().toLowerCase();
    return sortOrdersForOperations(byStatus).filter(
      (order) =>
        matchesOrderSearch(order, search) ||
        customerDisplayName(order, auth).toLowerCase().includes(normalizedSearch),
    );
  }, [auth, orders, search, statusFilter]);

  const selectedOrder =
    filteredOrders.find((order) => order.id === selectedOrderId) ?? filteredOrders[0];

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-280px] h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(14,116,144,0.18),rgba(255,255,255,0))]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <main className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
          <TopBar auth={auth} isDemoMode={isDemoMode} />

          <section className="mt-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-muted shadow-soft">
                  <Sparkles size={14} />
                  Production order flow
                </div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                  Order Operations
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  Monitor order state, inspect line items, and move fulfillment forward from one
                  focused console.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button className="btn btn-secondary" onClick={() => ordersQuery.refetch()}>
                  <RefreshCw size={16} />
                  Sync
                </button>
                {role === "CUSTOMER" ? (
                  <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
                    <Plus size={16} />
                    New order
                  </button>
                ) : (
                  <div className="rounded-token border border-line bg-panel px-3 py-2 text-sm text-muted">
                    Admins manage fulfillment status.
                  </div>
                )}
              </div>
            </div>
          </section>

          {isDemoMode ? (
            <div className="mt-5 rounded-token border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-[rgb(120,72,0)]">
              Backend API is not responding, so the console is showing demo operations data.
            </div>
          ) : null}

          <MetricsGrid metrics={metrics} role={role} />

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <section className="panel min-w-0">
              <div className="flex flex-col gap-4 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold">Order queue</h2>
                  <p className="text-sm text-muted">{filteredOrders.length} orders in view</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="field-shell w-full sm:w-72">
                    <Search size={16} className="text-muted" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search orders"
                      aria-label="Search orders"
                      className="field-input"
                    />
                  </div>
                  <div className="field-shell">
                    <SlidersHorizontal size={16} className="text-muted" />
                    <select
                      value={statusFilter}
                      onChange={(event) => setStatusFilter(event.target.value as OrderStatus | "ALL")}
                      aria-label="Status filter"
                      className="field-input min-w-36"
                    >
                      <option value="ALL">All statuses</option>
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <OrdersTable
                orders={filteredOrders}
                selectedOrderId={selectedOrder?.id}
                onSelect={setSelectedOrderId}
                auth={auth}
              />
            </section>

            {selectedOrder ? (
              <OrderDetail
                order={selectedOrder}
                role={role}
                auth={auth}
                isDemoMode={isDemoMode}
                onChanged={() => ordersQuery.refetch()}
              />
            ) : (
              <EmptyDetail />
            )}
          </div>
        </main>
      </div>

      <CreateOrderDrawer
        open={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => ordersQuery.refetch()}
      />
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="hidden border-r border-line bg-panel/80 px-4 py-5 backdrop-blur lg:block">
      <div className="flex items-center gap-3 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-token bg-text text-white shadow-lift">
          <ShoppingBag size={20} />
        </div>
        <div>
          <div className="text-sm font-semibold">Order Console</div>
          <div className="text-xs text-muted">Fulfillment ops</div>
        </div>
      </div>

      <nav className="mt-8 space-y-1">
        <div className="nav-item nav-item-active">
          <Layers3 size={17} />
          Dashboard
        </div>
      </nav>

      <div className="mt-8 rounded-token border border-line bg-raised p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldCheck size={16} />
          Auth bypass ready
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          The backend can run in reviewer mode with `AUTH_BYPASS=true`.
        </p>
      </div>
    </aside>
  );
}

function TopBar({ auth, isDemoMode }: { auth: ReturnType<typeof useOrderAuth>; isDemoMode: boolean }) {
  return (
    <header className="flex flex-col gap-3 rounded-token border border-line bg-panel/85 px-4 py-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-token bg-raised text-brand">
          <PanelRightOpen size={17} />
        </div>
        <div>
          <div className="text-sm font-medium">Backend</div>
          <div className="text-xs text-muted">{isDemoMode ? "Demo data" : "API connected"}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-token border border-line bg-raised px-3 py-2 text-xs font-medium text-muted sm:flex">
          <UserRound size={14} />
          {auth.userLabel}
        </div>
        {auth.authBypass || auth.reviewerRoleSwitchEnabled ? (
          <>
            <span className="text-xs font-medium text-muted">Role</span>
            <div className="segmented" aria-label="Role">
              {(["CUSTOMER", "ADMIN"] as UserRole[]).map((option) => (
                <button
                  key={option}
                  onClick={() => auth.setRole(option)}
                  className={clsx("segment", auth.role === option && "segment-active")}
                >
                  {option === "ADMIN" ? "Admin" : "Customer"}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-token border border-line bg-raised px-3 py-2 text-xs font-semibold text-text">
            {auth.role === "ADMIN" ? "Admin" : "Customer"}
          </div>
        )}
        <ClerkUserControl />
      </div>
    </header>
  );
}

function MetricsGrid({
  metrics,
  role,
}: {
  metrics: ReturnType<typeof calculateOrderMetrics>;
  role: UserRole;
}) {
  const cards = [
    { label: "Total orders", value: metrics.totalOrders, icon: Boxes, tone: "default" },
    { label: "Pending", value: metrics.pending, icon: Clock3, tone: "pending" },
    { label: "Processing", value: metrics.processing, icon: Activity, tone: "processing" },
    {
      label: role === "ADMIN" ? "Revenue" : "Spend",
      value: formatCurrency(metrics.revenue),
      icon: CircleDollarSign,
      tone: "money",
    },
  ];

  return (
    <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div className="metric-card" key={card.label}>
          <div className={clsx("metric-icon", `metric-${card.tone}`)}>
            <card.icon size={18} />
          </div>
          <div>
            <div className="text-2xl font-semibold tracking-tight">{card.value}</div>
            <div className="mt-1 text-sm text-muted">{card.label}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

function OrdersTable({
  orders,
  selectedOrderId,
  onSelect,
  auth,
}: {
  orders: Order[];
  selectedOrderId?: string;
  onSelect: (id: string) => void;
  auth: AuthContextValue;
}) {
  if (!orders.length) {
    return (
      <div className="grid min-h-64 place-items-center p-8 text-center">
        <div>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-token bg-raised text-muted">
            <ClipboardList size={20} />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No orders found</h3>
          <p className="mt-1 text-sm text-muted">Adjust the filters to widen the queue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-line">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Created</th>
            <th className="w-12 px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((order) => (
            <tr
              key={order.id}
              className={clsx("table-row", selectedOrderId === order.id && "table-row-active")}
            >
              <td className="px-4 py-3">
                <button
                  onClick={() => onSelect(order.id)}
                  className="font-mono text-sm font-semibold text-text hover:text-brand"
                >
                  {shortId(order.id)}
                </button>
              </td>
              <td className="px-4 py-3 text-sm text-muted">{customerDisplayName(order, auth)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold">
                {formatCurrency(order.total_amount)}
              </td>
              <td className="px-4 py-3 text-sm text-muted">{formatShortDate(order.created_at)}</td>
              <td className="px-4 py-3">
                <button className="icon-btn" onClick={() => onSelect(order.id)} aria-label="View order">
                  <ChevronRight size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderDetail({
  order,
  role,
  auth,
  isDemoMode,
  onChanged,
}: {
  order: Order;
  role: UserRole;
  auth: AuthContextValue;
  isDemoMode: boolean;
  onChanged: () => void;
}) {
  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(order.id),
    onSuccess: onChanged,
  });
  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(order.id, status),
    onSuccess: onChanged,
  });
  const nextStatuses = getNextStatuses(order.status);

  return (
    <aside className="panel overflow-hidden">
      <div className="border-b border-line p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {shortId(order.id)}
            </div>
            <h2 className="mt-2 text-xl font-semibold">Order detail</h2>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile label="Customer" value={customerDisplayName(order, auth)} />
          <InfoTile label="Total" value={formatCurrency(order.total_amount)} />
        </div>
      </div>

      <div className="space-y-6 p-5">
        <section>
          <h3 className="section-label">Line items</h3>
          <div className="mt-3 space-y-2">
            {order.items.map((item) => (
              <div className="line-item" key={item.id}>
                <div>
                  <div className="font-mono text-xs font-medium text-text">{shortId(item.product_id)}</div>
                  <div className="text-xs text-muted">Qty {item.quantity}</div>
                </div>
                <div className="text-sm font-semibold">{formatCurrency(item.unit_price)}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="section-label">Timeline</h3>
          <div className="mt-3 space-y-3">
            {order.status_history.map((entry) => (
              <div className="timeline-item" key={entry.id}>
                <div className="timeline-dot" />
                <div>
                  <div className="text-sm font-medium">{statusLabels[entry.status]}</div>
                  <div className="text-xs text-muted">
                    {entry.changed_by} · {formatShortDate(entry.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="section-label">Actions</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {role === "ADMIN" && nextStatuses.length ? (
              nextStatuses.map((status) => (
                <button
                  className="btn btn-secondary"
                  key={status}
                  disabled={statusMutation.isPending || isDemoMode}
                  onClick={() => statusMutation.mutate(status)}
                >
                  {statusMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                  {statusLabels[status]}
                </button>
              ))
            ) : (
              <span className="rounded-token border border-line bg-raised px-3 py-2 text-sm text-muted">
                {role === "ADMIN" ? "No transitions available" : "Switch to Admin for transitions"}
              </span>
            )}
            {role === "CUSTOMER" && order.status === "PENDING" ? (
              <button
                className="btn btn-danger"
                disabled={cancelMutation.isPending || isDemoMode}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
                Cancel
              </button>
            ) : null}
          </div>
          {isDemoMode ? <p className="mt-2 text-xs text-muted">Connect the backend API to enable writes.</p> : null}
          {cancelMutation.error || statusMutation.error ? (
            <p className="mt-2 text-xs text-danger">
              {(cancelMutation.error ?? statusMutation.error)?.message}
            </p>
          ) : null}
        </section>
      </div>
    </aside>
  );
}

function EmptyDetail() {
  return (
    <aside className="panel grid min-h-96 place-items-center p-8 text-center">
      <div>
        <PackageCheck className="mx-auto text-muted" size={28} />
        <h2 className="mt-3 text-base font-semibold">Select an order</h2>
        <p className="mt-1 text-sm text-muted">Details and actions will appear here.</p>
      </div>
    </aside>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-token border border-line bg-raised p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function customerDisplayName(order: Order, auth: AuthContextValue): string {
  if (order.customer_id === auth.userId || order.customer_id === auth.reviewerUserId) {
    return auth.userLabel;
  }
  return order.customer_id;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const Icon = statusIcon[status];
  return (
    <span className={clsx("status-badge", `status-${status.toLowerCase()}`)}>
      <Icon size={13} />
      {statusLabels[status]}
    </span>
  );
}

function CreateOrderDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const form = useForm<OrderFormInput, unknown, OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      items: [
        {
          product_id: crypto.randomUUID(),
          quantity: 1,
          unit_price: 49,
        },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = useWatch({ control: form.control, name: "items" }) ?? [];
  const liveTotal = watchedItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0,
  );

  const mutation = useMutation({
    mutationFn: (values: OrderFormValues) =>
      createOrder({
        items: values.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toFixed(2),
        })),
      }),
    onSuccess: () => {
      onCreated();
      onClose();
      form.reset();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button className="absolute inset-0 bg-text/20 backdrop-blur-sm" onClick={onClose} aria-label="Close drawer" />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-panel shadow-lift">
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="text-xl font-semibold">Create order</h2>
            <p className="mt-1 text-sm text-muted">Total {formatCurrency(liveTotal)}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {fields.map((field, index) => (
              <div className="rounded-token border border-line bg-raised p-4" key={field.id}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Item {index + 1}</h3>
                  {fields.length > 1 ? (
                    <button type="button" className="icon-btn" onClick={() => remove(index)} aria-label="Remove item">
                      <X size={15} />
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3">
                  <label className="form-label">
                    Product ID
                    <input className="form-input" {...form.register(`items.${index}.product_id`)} />
                    {form.formState.errors.items?.[index]?.product_id ? (
                      <span className="form-error">
                        {form.formState.errors.items[index]?.product_id?.message}
                      </span>
                    ) : null}
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="form-label">
                      Quantity
                      <input className="form-input" type="number" min="1" {...form.register(`items.${index}.quantity`)} />
                    </label>
                    <label className="form-label">
                      Unit price
                      <input
                        className="form-input"
                        type="number"
                        min="0.01"
                        step="0.01"
                        {...form.register(`items.${index}.unit_price`)}
                      />
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary w-full justify-center"
              onClick={() =>
                append({
                  product_id: crypto.randomUUID(),
                  quantity: 1,
                  unit_price: 25,
                })
              }
            >
              <Plus size={16} />
              Add item
            </button>
            {mutation.error ? <p className="text-sm text-danger">{mutation.error.message}</p> : null}
          </div>

          <div className="border-t border-line p-5">
            <button className="btn btn-primary w-full justify-center" disabled={mutation.isPending} type="submit">
              {mutation.isPending ? <Loader2 className="animate-spin" size={16} /> : <ShoppingBag size={16} />}
              Create order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
