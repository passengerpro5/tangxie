import { TasksController, createTasksHandler } from "./tasks.controller.ts";
import { TasksService } from "./tasks.service.ts";

export interface TasksModule {
  service: TasksService;
  controller: TasksController;
  handler: ReturnType<typeof createTasksHandler>;
}

export function createTasksModule() {
  const service = new TasksService();
  const controller = new TasksController(service);
  const handler = createTasksHandler(service);

  return {
    service,
    controller,
    handler,
  } satisfies TasksModule;
}

export { TasksController, createTasksHandler } from "./tasks.controller.ts";
export { TasksService } from "./tasks.service.ts";

