import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { OrderAuthProvider } from "./auth/AuthProvider";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OrderAuthProvider>
      <App />
    </OrderAuthProvider>
  </StrictMode>,
);
