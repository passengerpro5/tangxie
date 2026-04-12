import type { PrismaClient } from "@prisma/client";
import type {
  ConfirmedBlockRecord,
  CreateConfirmedBlockInput,
  UpdateConfirmedBlockInput,
  SchedulingRepository,
} from "./scheduling-repository.ts";

function cloneDate(date: Date) {
  return new Date(date.getTime());
}

function toConfirmedBlockRecord(record: {
  id: string;
  taskId: string;
  startAt: Date;
  endAt: Date;
  status: "confirmed" | "missed";
  task: {
    title: string;
  };
}): ConfirmedBlockRecord {
  return {
    id: record.id,
    taskId: record.taskId,
    title: record.task.title,
    startAt: cloneDate(record.startAt),
    endAt: cloneDate(record.endAt),
    durationMinutes: Math.max(
      0,
      Math.round((record.endAt.getTime() - record.startAt.getTime()) / 60000),
    ),
    status: record.status,
  };
}

export class PrismaSchedulingRepository implements SchedulingRepository {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async listConfirmedBlocks() {
    const records = await this.prisma.scheduleBlock.findMany({
      where: { status: "confirmed" },
      orderBy: { startAt: "asc" },
      include: {
        task: {
          select: {
            title: true,
          },
        },
      },
    });

    return records.map((record) =>
      toConfirmedBlockRecord({
        ...record,
        status: "confirmed",
      }),
    );
  }

  async createConfirmedBlocks(blocks: CreateConfirmedBlockInput[]) {
    if (blocks.length === 0) {
      return [];
    }

    return this.prisma.$transaction(async (tx) => {
      const createdIds: string[] = [];

      for (const block of blocks) {
        const created = await tx.scheduleBlock.create({
          data: {
            taskId: block.taskId,
            startAt: block.startAt,
            endAt: block.endAt,
            blockType: "focus",
            status: "confirmed",
            createdBy: "system",
          },
          select: { id: true },
        });

        createdIds.push(created.id);
      }

      const records = await tx.scheduleBlock.findMany({
        where: {
          id: {
            in: createdIds,
          },
        },
        orderBy: { startAt: "asc" },
        include: {
          task: {
            select: {
              title: true,
            },
          },
        },
      });

      return records.map((record) =>
        toConfirmedBlockRecord({
          ...record,
          status: "confirmed",
        }),
      );
    });
  }

  async updateConfirmedBlock(input: UpdateConfirmedBlockInput) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.scheduleBlock.findFirst({
        where: {
          id: input.blockId,
          taskId: input.taskId,
          status: "confirmed",
        },
        include: {
          task: {
            select: {
              title: true,
            },
          },
        },
      });

      if (!existing) {
        throw new Error(`Confirmed schedule block not found: ${input.blockId}`);
      }

      const updated = await tx.scheduleBlock.update({
        where: { id: input.blockId },
        data: {
          startAt: input.startAt,
          endAt: input.endAt,
        },
        include: {
          task: {
            select: {
              title: true,
            },
          },
        },
      });

      return toConfirmedBlockRecord({
        ...updated,
        status: "confirmed",
      });
    });
  }

  async markConfirmedBlockMissed(input: { taskId: string; blockId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.scheduleBlock.findFirst({
        where: {
          id: input.blockId,
          taskId: input.taskId,
          status: "confirmed",
        },
        include: {
          task: {
            select: {
              title: true,
            },
          },
        },
      });

      if (!existing) {
        throw new Error(`Confirmed schedule block not found: ${input.blockId}`);
      }

      const updated = await tx.scheduleBlock.update({
        where: { id: input.blockId },
        data: {
          status: "missed",
        },
        include: {
          task: {
            select: {
              title: true,
            },
          },
        },
      });

      return toConfirmedBlockRecord({
        ...updated,
        status: "missed",
      });
    });
  }
}
