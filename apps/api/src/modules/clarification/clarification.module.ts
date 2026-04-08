import { ClarificationController, createClarificationHandler } from "./clarification.controller.ts";
import { ClarificationService } from "./clarification.service.ts";
import { TasksService } from "../tasks/tasks.service.ts";

export interface ClarificationModule {
  service: ClarificationService;
  controller: ClarificationController;
  handler: ReturnType<typeof createClarificationHandler>;
}

export function createClarificationModule(tasksService = new TasksService()) {
  const service = new ClarificationService(tasksService);
  const controller = new ClarificationController(service);
  const handler = createClarificationHandler(service);

  return {
    service,
    controller,
    handler,
  } satisfies ClarificationModule;
}

export { ClarificationController, createClarificationHandler } from "./clarification.controller.ts";
export { ClarificationService } from "./clarification.service.ts";

