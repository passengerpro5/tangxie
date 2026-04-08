import {
  createInMemoryRemindersRepository,
  type CreateReminderInput,
  type ReminderRecord,
  type ReminderStatus,
  type ReminderType,
  type RemindersRepository,
} from "../../persistence/reminders-repository.ts";
import type { ConfirmedBlockRecord } from "../../persistence/scheduling-repository.ts";

export type { ReminderType, ReminderStatus, ReminderRecord, ConfirmedBlockRecord };

export type ConfirmedScheduleBlockRecord = ConfirmedBlockRecord;

export interface ReminderSummary {
  date: string;
  totalCount: number;
  startCount: number;
  deadlineCount: number;
  items: ReminderRecord[];
}

export interface GenerateRemindersInput {
  confirmedBlocks?: ConfirmedScheduleBlockRecord[];
  startLeadMinutes?: number;
  deadlineLeadMinutes?: number;
}

export interface GenerateRemindersResult {
  reminders: ReminderRecord[];
  summary: ReminderSummary;
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function createId(prefix: string, seed: number) {
  return `${prefix}_${seed.toString(36)}`;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addMinutes(date: Date, minutes: number) {
  const next = cloneDate(date);
  next.setUTCMinutes(next.getUTCMinutes() + minutes);
  return next;
}

function normalizeConfirmedBlocks(blocks: ConfirmedScheduleBlockRecord[]) {
  return blocks
    .filter((block) => block.status === "confirmed")
    .map((block) => ({
      ...block,
      startAt: cloneDate(block.startAt),
      endAt: cloneDate(block.endAt),
    }));
}

function buildReminderMessage(
  reminderType: ReminderType,
  block: ConfirmedScheduleBlockRecord,
  remindAt: Date,
) {
  if (reminderType === "start") {
    return `任务「${block.title}」即将在 ${remindAt.toISOString()} 开始`;
  }

  if (reminderType === "deadline") {
    return `任务「${block.title}」即将在 ${remindAt.toISOString()} 接近截止时间`;
  }

  return `今日待办包含任务「${block.title}」`;
}

export class RemindersService {
  private readonly clock: () => Date;
  private readonly repository: RemindersRepository;
  private readonly confirmedBlocksProvider?: () => Promise<ConfirmedScheduleBlockRecord[]>;
  private readonly confirmedBlocks: ConfirmedScheduleBlockRecord[] = [];

  constructor(options: {
    now?: () => Date;
    repository?: RemindersRepository;
    listConfirmedBlocks?: () => Promise<ConfirmedScheduleBlockRecord[]>;
  } = {}) {
    this.clock = options.now ?? (() => new Date());
    this.repository = options.repository ?? createInMemoryRemindersRepository();
    this.confirmedBlocksProvider = options.listConfirmedBlocks;
  }

  seedConfirmedBlocks(blocks: ConfirmedScheduleBlockRecord[]) {
    this.confirmedBlocks.splice(0, this.confirmedBlocks.length, ...normalizeConfirmedBlocks(blocks));
  }

  listConfirmedBlocks() {
    return this.confirmedBlocks.map((block) => ({
      ...block,
      startAt: cloneDate(block.startAt),
      endAt: cloneDate(block.endAt),
    }));
  }

  async listReminders() {
    return this.repository.listReminders();
  }

  async generateFromConfirmedBlocks(input: GenerateRemindersInput): Promise<GenerateRemindersResult> {
    const sourceBlocks = input.confirmedBlocks ?? (await this.loadConfirmedBlocks());
    const blocks = normalizeConfirmedBlocks(sourceBlocks);
    if (blocks.length !== sourceBlocks.length) {
      throw new Error("Only confirmed schedule blocks can generate reminders");
    }

    this.seedConfirmedBlocks(blocks);

    const startLeadMinutes = input.startLeadMinutes ?? 30;
    const deadlineLeadMinutes = input.deadlineLeadMinutes ?? 30;
    const now = this.clock();
    const generated: CreateReminderInput[] = [];

    for (const block of blocks) {
      generated.push(
        this.createReminder(block, "start", addMinutes(block.startAt, -startLeadMinutes), now),
      );
      generated.push(
        this.createReminder(block, "deadline", addMinutes(block.endAt, -deadlineLeadMinutes), now),
      );
    }

    const createdReminders = await this.repository.replaceRemindersForBlocks(
      blocks.map((block) => block.id),
      generated,
    );

    const summary = this.buildSummary(
      createdReminders.filter((reminder) => dateKey(reminder.remindAt) === dateKey(now)),
      dateKey(now),
    );
    return {
      reminders: createdReminders.map((reminder) => ({ ...reminder })),
      summary,
    };
  }

  async getDailySummary(date: Date | string) {
    const day = typeof date === "string" ? date.slice(0, 10) : dateKey(date);
    return this.buildSummary(await this.repository.listRemindersByDate(day), day);
  }

  private createReminder(
    block: ConfirmedScheduleBlockRecord,
    reminderType: ReminderType,
    remindAt: Date,
    now: Date,
  ): CreateReminderInput {
    return {
      blockId: block.id,
      taskId: block.taskId,
      title: block.title,
      reminderType,
      remindAt: cloneDate(remindAt),
      status: remindAt.getTime() <= now.getTime() ? "pending" : "pending",
      message: buildReminderMessage(reminderType, block, remindAt),
      createdAt: cloneDate(now),
    };
  }

  private async loadConfirmedBlocks() {
    if (this.confirmedBlocksProvider) {
      return this.confirmedBlocksProvider();
    }

    return this.listConfirmedBlocks();
  }

  private buildSummary(reminders: ReminderRecord[], date: string): ReminderSummary {
    const items = reminders
      .map((reminder) => ({
        ...reminder,
        remindAt: cloneDate(reminder.remindAt),
        createdAt: cloneDate(reminder.createdAt),
      }));

    return {
      date,
      totalCount: items.length,
      startCount: items.filter((item) => item.reminderType === "start").length,
      deadlineCount: items.filter((item) => item.reminderType === "deadline").length,
      items,
    };
  }
}
