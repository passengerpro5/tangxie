import { createSchedulingHandler } from "./scheduling.controller.ts";
import { SchedulingService } from "./scheduling.service.ts";

export class SchedulingModule {
  static createHandler(service = new SchedulingService()) {
    return createSchedulingHandler(service);
  }
}
