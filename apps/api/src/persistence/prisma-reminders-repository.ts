import type { PrismaClient } from "@prisma/client";
import type {
  CreateReminderInput,
  ReminderRecord,
  RemindersRepository,
} from "./reminders-repository.ts";

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function buildReminderMessage(
  reminderType: ReminderRecord["reminderType"],
  title: string,
  remindAt: Date,
) {
  if (reminderType === "start") {
    return `任务「${title}」即将在 ${remindAt.toISOString()} 开始`;
  }

  if (reminderType === "deadline") {
    return `任务「${title}」即将在 ${remindAt.toISOString()} 接近截止时间`;
  }

  return `今日待办包含任务「${title}」`;
}

function toReminderRecord(record: {
  id: string;
  taskId: string;
  reminderType: ReminderRecord["reminderType"];
  remindAt: Date;
  status: ReminderRecord["status"];
  createdAt: Date;
  scheduleBlockId: string | null;
  task: { title: string };
}): ReminderRecord {
  const title = record.task.title;
  return {
    id: record.id,
    blockId: record.scheduleBlockId ?? "",
    taskId: record.taskId,
    title,
    reminderType: record.reminderType,
    remindAt: cloneDate(record.remindAt),
    status: record.status,
    message: buildReminderMessage(record.reminderType, title, record.remindAt),
    createdAt: cloneDate(record.createdAt),
  };
}

export class PrismaRemindersRepository implements RemindersRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listReminders() {
    const records = await this.prisma.reminder.findMany({
      orderBy: { remindAt: "asc" },
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
    });

    return records.map(toReminderRecord);
  }

  async listRemindersByDate(dateKey: string) {
    const startAt = new Date(`${dateKey}T00:00:00.000Z`);
    const endAt = new Date(`${dateKey}T23:59:59.999Z`);
    const records = await this.prisma.reminder.findMany({
      where: {
        remindAt: {
          gte: startAt,
          lte: endAt,
        },
      },
      orderBy: { remindAt: "asc" },
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
    });

    return records.map(toReminderRecord);
  }

  async replaceRemindersForBlocks(blockIds: string[], reminders: CreateReminderInput[]) {
    return this.prisma.$transaction(async (tx) => {
      if (blockIds.length > 0) {
        await tx.reminder.deleteMany({
          where: {
            scheduleBlockId: {
              in: blockIds,
            },
          },
        });
      }

      const createdIds: string[] = [];

      for (const reminder of reminders) {
        const created = await tx.reminder.create({
          data: {
            taskId: reminder.taskId,
            scheduleBlockId: reminder.blockId,
            remindAt: reminder.remindAt,
            reminderType: reminder.reminderType,
            status: reminder.status,
          },
          select: { id: true },
        });

        createdIds.push(created.id);
      }

      const createdRecords = await tx.reminder.findMany({
        where: {
          id: {
            in: createdIds,
          },
        },
        orderBy: { remindAt: "asc" },
        include: {
          task: {
            select: {
              title: true,
            },
          },
        },
      });

      return createdRecords.map(toReminderRecord);
    });
  }
}
