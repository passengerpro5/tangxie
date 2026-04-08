export type ReminderType = "start" | "deadline" | "daily_summary";
export type ReminderStatus = "pending" | "sent" | "read" | "failed";

export interface ConfirmedScheduleBlockRecord {
  id: string;
  taskId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
  status: "confirmed";
}

export interface ReminderRecord {
  id: string;
  blockId: string;
  taskId: string;
  title: string;
  reminderType: ReminderType;
  remindAt: Date;
  status: ReminderStatus;
  message: string;
  createdAt: Date;
}

export interface ReminderSummary {
  date: string;
  totalCount: number;
  startCount: number;
  deadlineCount: number;
  items: ReminderRecord[];
}

export interface GenerateRemindersInput {
  confirmedBlocks: ConfirmedScheduleBlockRecord[];
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
  private readonly confirmedBlocks: ConfirmedScheduleBlockRecord[] = [];
  private readonly reminders: ReminderRecord[] = [];
  private reminderSeq = 0;

  constructor(options: { now?: () => Date } = {}) {
    this.clock = options.now ?? (() => new Date());
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

  listReminders() {
    return this.reminders.map((reminder) => ({
      ...reminder,
      remindAt: cloneDate(reminder.remindAt),
      createdAt: cloneDate(reminder.createdAt),
    }));
  }

  generateFromConfirmedBlocks(input: GenerateRemindersInput): GenerateRemindersResult {
    const blocks = normalizeConfirmedBlocks(input.confirmedBlocks);
    if (blocks.length !== input.confirmedBlocks.length) {
      throw new Error("Only confirmed schedule blocks can generate reminders");
    }

    this.seedConfirmedBlocks(blocks);

    const startLeadMinutes = input.startLeadMinutes ?? 30;
    const deadlineLeadMinutes = input.deadlineLeadMinutes ?? 30;
    const now = this.clock();
    const generated: ReminderRecord[] = [];

    for (const block of blocks) {
      generated.push(
        this.createReminder(block, "start", addMinutes(block.startAt, -startLeadMinutes), now),
      );
      generated.push(
        this.createReminder(block, "deadline", addMinutes(block.endAt, -deadlineLeadMinutes), now),
      );
    }

    this.reminders.push(...generated);

    const summary = this.buildSummary(now);
    return {
      reminders: generated.map((reminder) => ({ ...reminder })),
      summary,
    };
  }

  getDailySummary(date: Date | string) {
    const day = typeof date === "string" ? date.slice(0, 10) : dateKey(date);
    return this.buildSummary(this.clock(), day);
  }

  private createReminder(
    block: ConfirmedScheduleBlockRecord,
    reminderType: ReminderType,
    remindAt: Date,
    now: Date,
  ) {
    const reminder: ReminderRecord = {
      id: createId("reminder", ++this.reminderSeq),
      blockId: block.id,
      taskId: block.taskId,
      title: block.title,
      reminderType,
      remindAt: cloneDate(remindAt),
      status: remindAt.getTime() <= now.getTime() ? "pending" : "pending",
      message: buildReminderMessage(reminderType, block, remindAt),
      createdAt: cloneDate(now),
    };

    return reminder;
  }

  private buildSummary(now: Date, dateOverride?: string): ReminderSummary {
    const targetDate = dateOverride ?? dateKey(now);
    const items = this.reminders
      .filter((reminder) => dateKey(reminder.remindAt) === targetDate)
      .map((reminder) => ({
        ...reminder,
        remindAt: cloneDate(reminder.remindAt),
        createdAt: cloneDate(reminder.createdAt),
      }));

    return {
      date: targetDate,
      totalCount: items.length,
      startCount: items.filter((item) => item.reminderType === "start").length,
      deadlineCount: items.filter((item) => item.reminderType === "deadline").length,
      items,
    };
  }
}
