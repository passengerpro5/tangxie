import {
  overlaps,
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

  async updateConfirmedBlock(input: { taskId: string; blockId: string; startAt: Date; endAt: Date }) {
    if (input.endAt.getTime() <= input.startAt.getTime()) {
      throw new Error("endAt must be after startAt");
    }

    const confirmedBlocks = await this.repository.listConfirmedBlocks();
    const hasOverlap = confirmedBlocks.some(
      (block) =>
        block.id !== input.blockId &&
        overlaps(input.startAt, input.endAt, block.startAt, block.endAt),
    );
    if (hasOverlap) {
      throw new Error("Updated schedule block overlaps an existing confirmed block");
    }

    return this.repository.updateConfirmedBlock({
      taskId: input.taskId,
      blockId: input.blockId,
      startAt: new Date(input.startAt.getTime()),
      endAt: new Date(input.endAt.getTime()),
    });
  }

  async moveTaskBlockToTomorrow(taskId: string) {
    return this.shiftConfirmedTaskBlock(taskId, 1);
  }

  async moveTaskBlockLaterThisWeek(taskId: string) {
    return this.shiftConfirmedTaskBlock(taskId, 2);
  }

  async pauseTask(taskId: string) {
    const block = await this.findConfirmedBlockForTask(taskId);
    return this.repository.markConfirmedBlockMissed({
      taskId,
      blockId: block.id,
    });
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

  private async findConfirmedBlockForTask(taskId: string) {
    const confirmedBlocks = await this.repository.listConfirmedBlocks();
    const block = confirmedBlocks.find((item) => item.taskId === taskId);
    if (!block) {
      throw new Error(`Confirmed schedule block not found: ${taskId}`);
    }

    return block;
  }

  private async shiftConfirmedTaskBlock(taskId: string, daysToAdd: number) {
    const block = await this.findConfirmedBlockForTask(taskId);
    const startAt = new Date(block.startAt.getTime());
    const endAt = new Date(block.endAt.getTime());
    startAt.setUTCDate(startAt.getUTCDate() + daysToAdd);
    endAt.setUTCDate(endAt.getUTCDate() + daysToAdd);

    return this.repository.updateConfirmedBlock({
      taskId,
      blockId: block.id,
      startAt,
      endAt,
    });
  }
}
