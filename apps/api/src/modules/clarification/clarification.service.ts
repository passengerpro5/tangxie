import { TasksService } from "../tasks/tasks.service.ts";

export interface ClarificationReplyInput {
  sessionId: string;
  answerText: string;
}

export class ClarificationService {
  private readonly tasksService: TasksService;

  constructor(tasksService: TasksService) {
    this.tasksService = tasksService;
  }

  reply(input: ClarificationReplyInput) {
    return this.tasksService.replyToClarification(input);
  }

  getSession(sessionId: string) {
    const session = this.tasksService.getSession(sessionId);
    if (!session) {
      throw new Error("Clarification session not found");
    }

    return session;
  }
}
