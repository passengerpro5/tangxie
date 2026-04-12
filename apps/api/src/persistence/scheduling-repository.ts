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

export interface UpdateConfirmedBlockInput {
  taskId: string;
  blockId: string;
  startAt: Date;
  endAt: Date;
}

export interface SchedulingRepository {
  listConfirmedBlocks(): Promise<ConfirmedBlockRecord[]>;
  createConfirmedBlocks(blocks: CreateConfirmedBlockInput[]): Promise<ConfirmedBlockRecord[]>;
  updateConfirmedBlock(input: UpdateConfirmedBlockInput): Promise<ConfirmedBlockRecord>;
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
    async updateConfirmedBlock(input) {
      const index = confirmedBlocks.findIndex(
        (block) => block.id === input.blockId && block.taskId === input.taskId,
      );
      if (index < 0) {
        throw new Error(`Confirmed schedule block not found: ${input.blockId}`);
      }

      const updated: ConfirmedBlockRecord = {
        ...confirmedBlocks[index],
        startAt: cloneDate(input.startAt),
        endAt: cloneDate(input.endAt),
        durationMinutes: Math.max(
          0,
          Math.round((input.endAt.getTime() - input.startAt.getTime()) / 60000),
        ),
      };

      confirmedBlocks[index] = updated;
      return cloneConfirmedBlock(updated);
    },
  };
}
