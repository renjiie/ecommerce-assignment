import { useEffect, useRef } from "react";

import "@n8n/chat/style.css";

import type { AuthContextValue } from "../types";

const n8nWebhookUrl = import.meta.env.VITE_N8N_CHAT_WEBHOOK_URL?.trim();

export function N8nAssistantChat({ auth }: { auth: AuthContextValue }) {
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!n8nWebhookUrl || !targetRef.current) return undefined;

    let isDisposed = false;
    let chatApp: { unmount: () => void } | undefined;

    void import("@n8n/chat").then(({ createChat }) => {
      if (isDisposed || !targetRef.current) return;

      chatApp = createChat({
        webhookUrl: n8nWebhookUrl,
        target: targetRef.current,
        mode: "window",
        showWindowCloseButton: true,
        loadPreviousSession: false,
        showWelcomeScreen: false,
        initialMessages: [
          "Ask me about the order system, architecture, deployment, roles, or API flow.",
        ],
        metadata: {
          app: "ecommerce-order-console",
          role: auth.role,
          userId: auth.userId,
          userLabel: auth.userLabel,
          source: "vercel-frontend",
          responseFormat:
            "Answer in concise GitHub Markdown. Use short bold headings and compact bullets. Avoid raw JSON, HTML, long paragraphs, and deeply indented plain text.",
        },
        i18n: {
          en: {
            title: "Assistant",
            subtitle: "Architecture, APIs, deployment, and order workflows.",
            footer: "",
            getStarted: "New conversation",
            inputPlaceholder: "Ask about this assignment...",
            closeButtonTooltip: "Close assistant",
          },
        },
      });
    });

    return () => {
      isDisposed = true;
      chatApp?.unmount();
    };
  }, [auth.role, auth.userId, auth.userLabel]);

  return <div ref={targetRef} />;
}
