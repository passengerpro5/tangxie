import { App } from "./App.ts";

export function bootstrapAdminShell() {
  return App();
}

if (import.meta.main) {
  console.log(JSON.stringify(bootstrapAdminShell(), null, 2));
}
