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

  async reply(input: ClarificationReplyInput) {
    return this.tasksService.replyToClarification(input);
  }

  async getSession(sessionId: string) {
    const session = await this.tasksService.getSession(sessionId);
    if (!session) {
      throw new Error("Clarification session not found");
    }

    return session;
  }
}
