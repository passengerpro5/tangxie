import {
  proposeSequentialSchedule,
  type BusyBlockInput,
  type ScheduleProposalResult,
  type SchedulingTaskInput,
} from "./scheduler-rules.ts";

export type ScheduleTaskInput = SchedulingTaskInput;

export interface ScheduleProposeInput {
  taskIds: string[];
}

export interface ConfirmedBlockRecord {
  id: string;
  taskId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  status: "confirmed";
}

export interface SchedulingState {
  tasks: SchedulingTaskInput[];
  confirmedBlocks: ConfirmedBlockRecord[];
}

export class SchedulingService {
  private readonly clock: () => Date;
  private readonly state: SchedulingState = {
    tasks: [],
    confirmedBlocks: [],
  };

  constructor(options: { now?: () => Date } = {}) {
    this.clock = options.now ?? (() => new Date());
  }

  seedTasks(tasks: SchedulingTaskInput[]) {
    this.state.tasks = tasks.map((task) => ({
      ...task,
      deadlineAt: task.deadlineAt ? new Date(task.deadlineAt.getTime()) : null,
      createdAt: new Date(task.createdAt.getTime()),
    }));
  }

  listTasks() {
    return this.state.tasks.map((task) => ({
      ...task,
      deadlineAt: task.deadlineAt ? new Date(task.deadlineAt.getTime()) : null,
      createdAt: new Date(task.createdAt.getTime()),
    }));
  }

  propose(input: ScheduleProposeInput): ScheduleProposalResult {
    const selectedTasks = input.taskIds.map((taskId) => this.requireTask(taskId));
    return proposeSequentialSchedule(selectedTasks, this.confirmedBlocksAsBusyBlocks(), this.clock());
  }

  confirm(taskIds: string[]) {
    const proposal = this.propose({ taskIds });
    if (!proposal.ok) {
      return proposal;
    }

    const confirmedBlocks = proposal.blocks.map((block) => ({
      ...block,
      startAt: new Date(block.startAt.getTime()),
      endAt: new Date(block.endAt.getTime()),
      status: "confirmed" as const,
    }));

    this.state.confirmedBlocks.push(...confirmedBlocks);

    return {
      ok: true as const,
      blocks: confirmedBlocks,
      orderedTaskIds: proposal.orderedTaskIds,
    };
  }

  listConfirmedBlocks() {
    return this.state.confirmedBlocks.map((block) => ({
      ...block,
      startAt: new Date(block.startAt.getTime()),
      endAt: new Date(block.endAt.getTime()),
    }));
  }

  private confirmedBlocksAsBusyBlocks(): BusyBlockInput[] {
    return this.state.confirmedBlocks.map((block) => ({
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
