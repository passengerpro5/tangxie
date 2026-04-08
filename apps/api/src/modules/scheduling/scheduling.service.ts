import {
  proposeSequentialSchedule,
  type BusyBlockInput,
  type ScheduleProposalResult,
  type SchedulingTaskInput,
} from "./scheduler-rules.ts";
import {
  cloneSchedulingTask,
  createInMemorySchedulingRepository,
  type ConfirmedBlockRecord,
  type SchedulingRepository,
} from "../../persistence/scheduling-repository.ts";

export type ScheduleTaskInput = SchedulingTaskInput;

export interface ScheduleProposeInput {
  taskIds: string[];
}

export interface SchedulingState {
  tasks: SchedulingTaskInput[];
}

export interface SchedulingServiceOptions {
  now?: () => Date;
  repository?: SchedulingRepository;
}

export class SchedulingService {
  private readonly clock: () => Date;
  private readonly repository: SchedulingRepository;
  private readonly state: SchedulingState = {
    tasks: [],
  };

  constructor(options: SchedulingServiceOptions = {}) {
    this.clock = options.now ?? (() => new Date());
    this.repository = options.repository ?? createInMemorySchedulingRepository();
  }

  seedTasks(tasks: SchedulingTaskInput[]) {
    this.state.tasks = tasks.map(cloneSchedulingTask);
  }

  listTasks() {
    return this.state.tasks.map(cloneSchedulingTask);
  }

  async propose(input: ScheduleProposeInput): Promise<ScheduleProposalResult> {
    const selectedTasks = input.taskIds.map((taskId) => this.requireTask(taskId));
    return proposeSequentialSchedule(
      selectedTasks,
      await this.confirmedBlocksAsBusyBlocks(),
      this.clock(),
    );
  }

  async confirm(taskIds: string[]) {
    const proposal = await this.propose({ taskIds });
    if (!proposal.ok) {
      return proposal;
    }

    const confirmedBlocks = await this.repository.createConfirmedBlocks(
      proposal.blocks.map((block) => ({
        taskId: block.taskId,
        title: block.title,
        startAt: new Date(block.startAt.getTime()),
        endAt: new Date(block.endAt.getTime()),
        durationMinutes: block.durationMinutes,
      })),
    );

    return {
      ok: true as const,
      blocks: confirmedBlocks,
      orderedTaskIds: proposal.orderedTaskIds,
    };
  }

  async listConfirmedBlocks() {
    return this.repository.listConfirmedBlocks();
  }

  private async confirmedBlocksAsBusyBlocks(): Promise<BusyBlockInput[]> {
    const blocks = await this.repository.listConfirmedBlocks();
    return blocks.map((block) => ({
      startAt: new Date(block.startAt.getTime()),
      endAt: new Date(block.endAt.getTime()),
    }));
  }

  private requireTask(taskId: string) {
    const task = this.state.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    return task;
  }
}
