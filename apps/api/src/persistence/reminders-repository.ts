export type ReminderType = "start" | "deadline" | "daily_summary";
export type ReminderStatus = "pending" | "sent" | "read" | "failed";

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

export interface CreateReminderInput {
  blockId: string;
  taskId: string;
  title: string;
  reminderType: ReminderType;
  remindAt: Date;
  status: ReminderStatus;
  message: string;
  createdAt: Date;
}

export interface RemindersRepository {
  listReminders(): Promise<ReminderRecord[]>;
  listRemindersByDate(dateKey: string): Promise<ReminderRecord[]>;
  replaceRemindersForBlocks(
    blockIds: string[],
    reminders: CreateReminderInput[],
  ): Promise<ReminderRecord[]>;
}

function createId(prefix: string, seed: number) {
  return `${prefix}_${seed.toString(36)}`;
}

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function cloneReminder(reminder: ReminderRecord): ReminderRecord {
  return {
    ...reminder,
    remindAt: cloneDate(reminder.remindAt),
    createdAt: cloneDate(reminder.createdAt),
  };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function createInMemoryRemindersRepository(): RemindersRepository {
  let reminderSeq = 0;
  const reminders: ReminderRecord[] = [];

  return {
    async listReminders() {
      return reminders.map(cloneReminder);
    },
    async listRemindersByDate(dateKey) {
      return reminders
        .filter((reminder) => dayKey(reminder.remindAt) === dateKey)
        .map(cloneReminder);
    },
    async replaceRemindersForBlocks(blockIds, nextReminders) {
      if (blockIds.length > 0) {
        const remaining = reminders.filter((reminder) => !blockIds.includes(reminder.blockId));
        reminders.splice(0, reminders.length, ...remaining);
      }

      const created = nextReminders.map((reminder) => ({
        id: createId("reminder", ++reminderSeq),
        blockId: reminder.blockId,
        taskId: reminder.taskId,
        title: reminder.title,
        reminderType: reminder.reminderType,
        remindAt: cloneDate(reminder.remindAt),
        status: reminder.status,
        message: reminder.message,
        createdAt: cloneDate(reminder.createdAt),
      }));

      reminders.push(...created);
      return created.map(cloneReminder);
    },
  };
}
