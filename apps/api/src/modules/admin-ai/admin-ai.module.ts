import { AdminAiService, type AdminAiServiceOptions } from "./admin-ai.service.ts";
import { createAdminAiHandler, type AdminAiHandler } from "./admin-ai.controller.ts";

export interface AdminAiModuleOptions extends AdminAiServiceOptions {}

export class AdminAiModule {
  static create(options: AdminAiModuleOptions = {}) {
    const service = new AdminAiService(options);
    const handler = createAdminAiHandler(service);
    return { service, handler };
  }
}

export { AdminAiService } from "./admin-ai.service.ts";
export { createAdminAiHandler } from "./admin-ai.controller.ts";
export type { AdminAiHandler } from "./admin-ai.controller.ts";
