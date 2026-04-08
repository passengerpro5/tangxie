import { createRemindersHandler } from "./reminders.controller.ts";
import { RemindersService } from "./reminders.service.ts";

export class RemindersModule {
  static createHandler() {
    return createRemindersHandler(new RemindersService());
  }
}
