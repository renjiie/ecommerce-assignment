import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/clerk-react", () => ({
  ClerkProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignedIn: ({ children }: { children: ReactNode }) => <>{children}</>,
  SignedOut: () => null,
  SignInButton: ({ children }: { children: ReactNode }) => <>{children}</>,
  UserButton: () => <button aria-label="User account">Account</button>,
  useAuth: () => ({
    getToken: async () => "test-token",
    isLoaded: true,
    isSignedIn: true,
    signOut: vi.fn(),
  }),
  useUser: () => ({
    user: {
      id: "user_123",
      primaryEmailAddress: { emailAddress: "reviewer@example.com" },
      publicMetadata: { role: "CUSTOMER" },
    },
  }),
}));

import App from "./App";
import { OrderAuthProvider } from "./auth/AuthProvider";

describe("App", () => {
  it("renders the operations console with dashboard, filters, and create form", async () => {
    render(
      <OrderAuthProvider>
        <App />
      </OrderAuthProvider>,
    );

    expect(screen.getByRole("heading", { name: /order operations/i })).toBeInTheDocument();
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/spend/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /orders/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new order/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /new order/i }));

    expect(screen.getByRole("heading", { name: /create order/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/product id/i)).toBeInTheDocument();
  });
});
