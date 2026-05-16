import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
  useUser,
} from "@clerk/clerk-react";
import { type ReactNode, useMemo, useState } from "react";

import type { AuthContextValue, UserRole } from "../types";
import { AuthContext } from "./authContext";

const authBypass = import.meta.env.VITE_AUTH_BYPASS !== "false";
const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const reviewerRoleSwitchEnabled =
  import.meta.env.MODE !== "production" && import.meta.env.VITE_REVIEWER_ROLE_SWITCH !== "false";

function reviewerUserIdForRole(role: UserRole): string {
  return role === "ADMIN" ? "admin-1" : "customer-1";
}

export function OrderAuthProvider({ children }: { children: ReactNode }) {
  if (authBypass) {
    return <DevAuthProvider>{children}</DevAuthProvider>;
  }

  if (!clerkPublishableKey) {
    return <MissingClerkConfig />;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ClerkAuthGate>{children}</ClerkAuthGate>
    </ClerkProvider>
  );
}

function DevAuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("CUSTOMER");
  const value = useMemo<AuthContextValue>(
    () => ({
      authBypass: true,
      reviewerRoleSwitchEnabled: true,
      reviewerUserId: reviewerUserIdForRole(role),
      role,
      userId: reviewerUserIdForRole(role),
      userLabel: reviewerUserIdForRole(role),
      isLoaded: true,
      isSignedIn: true,
      getToken: async () => null,
      setRole,
    }),
    [role],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ClerkAuthGate({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedOut>
        <ClerkSignInScreen />
      </SignedOut>
      <SignedIn>
        <ClerkAuthProvider>{children}</ClerkAuthProvider>
      </SignedIn>
    </>
  );
}

function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const role = String(user?.publicMetadata?.role ?? "CUSTOMER").toUpperCase() as UserRole;
  const safeRole: UserRole = role === "ADMIN" ? "ADMIN" : "CUSTOMER";
  const userId = user?.id ?? "clerk-user";
  const userLabel = user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? user?.id ?? "Signed in";
  const [reviewerRoleOverride, setReviewerRoleOverride] = useState<{
    role: UserRole;
    userId: string;
  } | null>(null);
  const reviewerRole = reviewerRoleOverride?.userId === userId ? reviewerRoleOverride.role : null;
  const effectiveRole = reviewerRoleSwitchEnabled ? (reviewerRole ?? safeRole) : safeRole;

  const value = useMemo<AuthContextValue>(
    () => ({
      authBypass: false,
      reviewerRoleSwitchEnabled,
      role: effectiveRole,
      userId,
      userLabel,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      getToken,
      setRole: reviewerRoleSwitchEnabled
        ? (nextRole) => setReviewerRoleOverride({ role: nextRole, userId })
        : () => undefined,
      signOut: () => void signOut(),
    }),
    [effectiveRole, getToken, isLoaded, isSignedIn, signOut, userId, userLabel],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function ClerkSignInScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4 text-text">
      <div className="w-full max-w-md rounded-token border border-line bg-panel p-6 text-center shadow-soft">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-token bg-text text-white">
          OC
        </div>
        <h1 className="mt-5 text-2xl font-semibold">Sign in to Order Console</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Clerk authentication is enabled. Sign in with a user whose public metadata contains
          `role: "CUSTOMER"` or `role: "ADMIN"`.
        </p>
        <SignInButton mode="modal">
          <button className="btn btn-primary mt-5 w-full justify-center">Sign in with Clerk</button>
        </SignInButton>
      </div>
    </div>
  );
}

function MissingClerkConfig() {
  return (
    <div className="grid min-h-screen place-items-center bg-bg px-4 text-text">
      <div className="w-full max-w-lg rounded-token border border-danger/25 bg-panel p-6 shadow-soft">
        <h1 className="text-xl font-semibold">Clerk publishable key missing</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Set `VITE_CLERK_PUBLISHABLE_KEY` when `VITE_AUTH_BYPASS=false`, or enable
          `VITE_AUTH_BYPASS=true` for local reviewer mode.
        </p>
      </div>
    </div>
  );
}

export function ClerkUserControl() {
  if (authBypass) return null;
  return <UserButton afterSignOutUrl="/" />;
}
