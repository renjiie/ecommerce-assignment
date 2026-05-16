import { createContext, useContext } from "react";

import type { AuthContextValue } from "../types";

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useOrderAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useOrderAuth must be used inside OrderAuthProvider");
  }
  return value;
}

