import type { SchedulingTaskInput } from "../modules/scheduling/scheduler-rules.ts";

export interface ConfirmedBlockRecord {
  id: string;
  taskId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  status: "confirmed";
}

export interface CreateConfirmedBlockInput {
  taskId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
}

export interface SchedulingRepository {
  listConfirmedBlocks(): Promise<ConfirmedBlockRecord[]>;
  createConfirmedBlocks(blocks: CreateConfirmedBlockInput[]): Promise<ConfirmedBlockRecord[]>;
}

function createId(prefix: string, seed: number) {
  return `${prefix}_${seed.toString(36)}`;
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function cloneConfirmedBlock(block: ConfirmedBlockRecord): ConfirmedBlockRecord {
  return {
    ...block,
    startAt: cloneDate(block.startAt),
    endAt: cloneDate(block.endAt),
  };
}

export function cloneSchedulingTask(task: SchedulingTaskInput): SchedulingTaskInput {
  return {
    ...task,
    deadlineAt: task.deadlineAt ? cloneDate(task.deadlineAt) : null,
    createdAt: cloneDate(task.createdAt),
  };
}

export function createInMemorySchedulingRepository(): SchedulingRepository {
  let blockSeq = 0;
  const confirmedBlocks: ConfirmedBlockRecord[] = [];

  return {
    async listConfirmedBlocks() {
      return confirmedBlocks.map(cloneConfirmedBlock);
    },
    async createConfirmedBlocks(blocks) {
      const created = blocks.map((block) => ({
        id: createId("block", ++blockSeq),
        taskId: block.taskId,
        title: block.title,
        startAt: cloneDate(block.startAt),
        endAt: cloneDate(block.endAt),
        durationMinutes: block.durationMinutes,
        status: "confirmed" as const,
      }));

      confirmedBlocks.push(...created);
      return created.map(cloneConfirmedBlock);
    },
  };
}
