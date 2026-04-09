import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App.ts";
import { createAdminApiClient } from "./lib/api-client.ts";
import { createAdminConsoleController } from "./runtime/admin-console.ts";
import { AdminShellApp } from "./ui/admin-shell-app.tsx";

export function bootstrapAdminBrowser(
  target: HTMLElement,
  baseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL ?? "http://127.0.0.1:3000",
) {
  const controller = createAdminConsoleController({
    apiClient: createAdminApiClient({ baseUrl }),
  });

  const root = ReactDOM.createRoot(target);
  root.render(
    <React.StrictMode>
      <AdminShellApp shell={App()} controller={controller} />
    </React.StrictMode>,
  );

  return {
    controller,
    unmount() {
      root.unmount();
    },
  };
}
