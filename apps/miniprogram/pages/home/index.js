import { createArrangeSheet,                        } from "../../components/arrange-sheet/index.js";
import { createKanbanView,                                       } from "../../components/kanban-view/index.js";
import { createScheduleView,                                               } from "../../components/schedule-view/index.js";
import { createTaskDetailPage } from "../task-detail/index.js";
import { createHomePageRuntime } from "./runtime.js";

                                                           

                               
                
                
 

                                                                    
                  
                           
                     
                        
                        
                        
                           
                     
                        
                      
                                                                           
                        
                                          
 

                                      
             
                  
                
                
 

                                  
             
                    
                    
                    
                  
                              
 

                                   
             
                
                 
 

                                    
             
                          
                
                 
                
                 
                       
                     
                     
                   
                 
                    
                  
                   
                        
 

                                           
             
                
                    
                      
 

                                           
             
                
                
 

                                                                                 
                                                     
                                                             

                                     
                           
                
 

                                       
             
                
                 
                    
                  
                
 

                                  
             
                 
                
                 
                    
 

                                         
             
                
                   
                          
 

                                   
                       
                                     
                                
                     
                         
                            
                            
                        
                                 
                        
                      
                             
                                    
                                        
                     
 

                                         
                
                   
 

                                           
             
                
                
 

                                                  
                
                   
                    
                                             
                                              
                                      
 

                                   
                
                                 
                                                          
 

                                    
                             
                           
                             
 

                                   
                        
                       
                            
                         
                             
                           
                               
                                  
                         
                              
                             
                          
                                
                              
                                            
                                            
 

                                
                
                
                   
                       
                       
                            
                                   
                                  
                              
                                 
                                 
                                  
                        
                                     
               
                   
                  
                    
                  
                            
                        
                       
 

const DEFAULT_TASKS                 = [
  {
    id: "task-1",
    title: "论文初稿",
    summary: "补齐提纲、正文和摘要，今晚前完成第一版可交付内容。",
    startAt: "2026-04-08T02:00:00.000Z",
    endAt: "2026-04-08T06:30:00.000Z",
    deadlineAt: "2026-04-10T18:00:00.000Z",
    status: "scheduled",
    deadlineLabel: formatRelativeDeadlineLabel("2026-04-10T18:00:00.000Z"),
    durationLabel: "2 小时",
    priorityLabel: "P1",
    importanceReason: "deadline=2026-04-10T18:00:00.000Z, duration=120m",
    categoryId: "writing",
    categoryTitle: "论文写作",
    sourceLabel: "安排任务",
    executionPlan: [
      {
        id: "task-1-plan-1",
        label: `${formatRelativeDeadlineLabel("2026-04-08T02:00:00.000Z")} 10:00 - 12:00 完成提纲和摘要`,
        statusLabel: "进行中",
      },
      {
        id: "task-1-plan-2",
        label: `${formatRelativeDeadlineLabel("2026-04-08T06:00:00.000Z")} 14:00 - 16:30 补正文主体`,
        statusLabel: "待执行",
      },
    ],
    suggestions: ["先完成提纲和摘要，再集中写正文。", "如果时间不足，优先保证主结论和目录完整。"],
    scheduleSegments: [
      { id: "task-1-seg-1", startAt: "2026-04-08T02:00:00.000Z", endAt: "2026-04-08T04:00:00.000Z", label: "10:00-12:00" },
      { id: "task-1-seg-2", startAt: "2026-04-08T06:00:00.000Z", endAt: "2026-04-08T08:30:00.000Z", label: "14:00-16:30" },
    ],
  },
  {
    id: "task-2",
    title: "整理资料",
    summary: "把参考文献、截图和访谈记录归档到同一套目录中。",
    startAt: "2026-04-08T07:00:00.000Z",
    endAt: "2026-04-08T08:00:00.000Z",
    deadlineAt: "2026-04-11T12:00:00.000Z",
    status: "needs_info",
    deadlineLabel: formatRelativeDeadlineLabel("2026-04-11T12:00:00.000Z"),
    durationLabel: "待估算",
    priorityLabel: "P2",
    importanceReason: "需要补充 deadline 和时长",
    categoryId: "collect",
    categoryTitle: "资料整理",
    sourceLabel: "文档导入",
    executionPlan: [
      { id: "task-2-plan-1", label: "先确认资料范围和最终交付目录", statusLabel: "待补信息" },
    ],
    suggestions: ["先定归档标准，再开始搬运资料。"],
    scheduleSegments: [
      { id: "task-2-seg-1", startAt: "2026-04-08T07:00:00.000Z", endAt: "2026-04-08T08:00:00.000Z", label: "15:00-16:00" },
    ],
  },
  {
    id: "task-3",
    title: "已完成的复盘",
    summary: "整理这周安排执行情况，更新下周的时间分配建议。",
    startAt: "2026-04-07T09:00:00.000Z",
    endAt: "2026-04-07T09:30:00.000Z",
    deadlineAt: "2027-01-03T12:00:00.000Z",
    status: "done",
    deadlineLabel: formatRelativeDeadlineLabel("2027-01-03T12:00:00.000Z"),
    durationLabel: "30 分钟",
    priorityLabel: "P3",
    importanceReason: "已完成",
    categoryId: "review",
    categoryTitle: "复盘整理",
    sourceLabel: "手动整理",
    executionPlan: [
      { id: "task-3-plan-1", label: "2026.04.07 17:00 - 17:30 已完成复盘", statusLabel: "已完成" },
    ],
    suggestions: ["保留复盘结论，方便下次排期时直接复用。"],
    scheduleSegments: [
      { id: "task-3-seg-1", startAt: "2026-04-07T09:00:00.000Z", endAt: "2026-04-07T09:30:00.000Z", label: "17:00-17:30" },
    ],
  },
];

function toSystemDateId(date      ) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatRelativeDeadlineLabel(value        ) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "待确认";
  }

  const current = new Date();
  const currentDayId = toSystemDateId(current);
  const targetDayId = toSystemDateId(date);
  const tomorrow = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
  const tomorrowDayId = toSystemDateId(tomorrow);

  if (targetDayId === currentDayId) {
    return "今天";
  }

  if (targetDayId === tomorrowDayId) {
    return "明天";
  }

  if (date.getFullYear() > current.getFullYear()) {
    return "明年";
  }

  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function formatTaskTimeRangeLabel(startAt        , endAt        ) {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const startDayLabel = formatRelativeDeadlineLabel(startAt);
  const endDayLabel = formatRelativeDeadlineLabel(endAt);
  const startTimeLabel = formatMinutesLabel(start.getUTCHours() * 60 + start.getUTCMinutes());
  const endTimeLabel = formatMinutesLabel(end.getUTCHours() * 60 + end.getUTCMinutes());

  if (toSystemDateId(start) === toSystemDateId(end)) {
    return `${startDayLabel} ${startTimeLabel} - ${endTimeLabel}`;
  }

  return `${startDayLabel} ${startTimeLabel} - ${endDayLabel} ${endTimeLabel}`;
}

const TIMELINE_DAY_MINUTES = 24 * 60;
const TIMELINE_MINUTE_HEIGHT_RPX = 2;
const TIMELINE_DAY_COLUMN_WIDTH_RPX = 176;
const TIMELINE_DEFAULT_VISIBLE_DAY_COUNT = 3;
const TIMELINE_VISIBLE_DAY_COUNT_OPTIONS = [1, 2, 3, 5, 7];
const TIMELINE_PAST_DAYS = 3;
const TIMELINE_FUTURE_DAYS = 6;
const DEFAULT_DEVICE_WIDTH_PX = 375;
const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]         ;
const PLANNING_PERIODS                       = [
  { id: "day", label: "日" },
  { id: "week", label: "周" },
  { id: "month", label: "月" },
  { id: "quarter", label: "季" },
  { id: "year", label: "年" },
];
const PLANNING_DAY_MINUTE_HEIGHT_RPX = 2;
const PLANNING_DAY_COLUMN_HEIGHT_RPX = TIMELINE_DAY_MINUTES * PLANNING_DAY_MINUTE_HEIGHT_RPX;
const PLANNING_RANGE_SLOT_HEIGHT_RPX = 128;
const PLANNING_YEAR_SLOT_HEIGHT_RPX = 104;
const PLANNING_GANTT_VIEWPORT_HEIGHT_RPX = 980;

function createTabs()                 {
  return [
    { id: "schedule", label: "日程" },
    { id: "kanban", label: "事项" },
    { id: "planning", label: "排期" },
  ];
}

function parseUtcDate(value        ) {
  return new Date(value);
}

function toUtcDateId(value        ) {
  const date = parseUtcDate(value);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function minutesSinceUtcMidnight(value        ) {
  const date = parseUtcDate(value);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function formatMinutesLabel(minutes        ) {
  if (minutes === TIMELINE_DAY_MINUTES) {
    return "24:00";
  }
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function createFallbackDateId(tasks                ) {
  const scheduledTask = tasks.find(hasScheduleSegments);
  return scheduledTask ? toUtcDateId(scheduledTask.startAt) : "2026-04-08";
}

function hasScheduleSegments(task                                        ) {
  return !Array.isArray(task.scheduleSegments) || task.scheduleSegments.length > 0;
}

function sortScheduleSegments(segments                       ) {
  return segments.slice().sort((left, right) => left.startAt.localeCompare(right.startAt));
}

const TIMELINE_BLOCK_SIDE_MARGIN_RPX = 0;
const TIMELINE_BLOCK_LANE_GAP_RPX = 0;

function assignTimelineBlockLanes(blocks                     , dayColumnWidthRpx        ) {
  if (blocks.length <= 1) {
    return blocks.map((block) => ({
      ...block,
      leftRpx: TIMELINE_BLOCK_SIDE_MARGIN_RPX,
      rightRpx: TIMELINE_BLOCK_SIDE_MARGIN_RPX,
    }));
  }

  const sorted = blocks
    .map((block) => ({ ...block }))
    .sort(
      (left, right) =>
        left.startMinutes - right.startMinutes ||
        left.endMinutes - right.endMinutes ||
        left.id.localeCompare(right.id),
    );
  const laidOut                                                                      = [];
  let active                                                   = [];
  let clusterIndices           = [];
  let clusterLaneCount = 1;

  const flushCluster = () => {
    if (!clusterIndices.length) {
      return;
    }

    const usableWidthRpx = dayColumnWidthRpx - TIMELINE_BLOCK_SIDE_MARGIN_RPX * 2;
    const laneCount = Math.max(1, clusterLaneCount);
    const laneWidthRpx =
      laneCount === 1
        ? usableWidthRpx
        : Math.max(
            36,
            Math.floor((usableWidthRpx - TIMELINE_BLOCK_LANE_GAP_RPX * (laneCount - 1)) / laneCount),
          );

    for (const index of clusterIndices) {
      const block = laidOut[index];
      const leftRpx =
        TIMELINE_BLOCK_SIDE_MARGIN_RPX + block.laneIndex * (laneWidthRpx + TIMELINE_BLOCK_LANE_GAP_RPX);
      const rightRpx = Math.max(
        TIMELINE_BLOCK_SIDE_MARGIN_RPX,
        dayColumnWidthRpx - leftRpx - laneWidthRpx,
      );
      laidOut[index] = {
        ...block,
        laneCount,
        leftRpx,
        rightRpx,
      };
    }

    clusterIndices = [];
    clusterLaneCount = 1;
  };

  for (const block of sorted) {
    active = active.filter((entry) => entry.endMinutes > block.startMinutes);
    if (!active.length) {
      flushCluster();
    }

    const usedLanes = new Set(active.map((entry) => entry.laneIndex));
    let laneIndex = 0;
    while (usedLanes.has(laneIndex)) {
      laneIndex += 1;
    }

    const index = laidOut.length;
    laidOut.push({
      ...block,
      laneIndex,
      laneCount: 1,
      leftRpx: TIMELINE_BLOCK_SIDE_MARGIN_RPX,
      rightRpx: TIMELINE_BLOCK_SIDE_MARGIN_RPX,
    });
    clusterIndices.push(index);
    active.push({ laneIndex, endMinutes: block.endMinutes });
    clusterLaneCount = Math.max(clusterLaneCount, active.length);
  }

  flushCluster();

  return laidOut
    .map(({ laneIndex: _laneIndex, laneCount: _laneCount, ...block }) => block)
    .sort(
      (left, right) =>
        left.startMinutes - right.startMinutes ||
        left.endMinutes - right.endMinutes ||
        left.id.localeCompare(right.id),
    );
}

function formatDurationMinutesLabel(totalMinutes        ) {
  if (totalMinutes >= 60 && totalMinutes % 60 === 0) {
    return `${Math.round(totalMinutes / 60)} 小时`;
  }

  return `${Math.max(1, totalMinutes)} 分钟`;
}

function buildExecutionPlanFromSegments(segments                       ) {
  if (!segments.length) {
    return [{ id: "task-plan-pending", label: "等待生成具体排期", statusLabel: "待安排" }];
  }

  return segments.map((segment) => ({
    id: `${segment.id}-plan`,
    label: `${formatRelativeDeadlineLabel(segment.startAt)} ${formatMinutesLabel(minutesSinceUtcMidnight(segment.startAt))} - ${formatMinutesLabel(minutesSinceUtcMidnight(segment.endAt))}`,
    statusLabel: "已排期",
  }));
}

export function patchHomeTaskScheduleBlock(
  tasks                ,
  taskId        ,
  blockId        ,
  payload                                    ,
) {
  return tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    const nextSegments = sortScheduleSegments(
      task.scheduleSegments.map((segment) =>
        segment.id === blockId
          ? {
              ...segment,
              startAt: payload.startAt,
              endAt: payload.endAt,
              label: `${formatMinutesLabel(minutesSinceUtcMidnight(payload.startAt))}-${formatMinutesLabel(minutesSinceUtcMidnight(payload.endAt))}`,
            }
          : segment,
      ),
    );

    if (!nextSegments.some((segment) => segment.id === blockId)) {
      return task;
    }

    const firstSegment = nextSegments[0];
    const lastSegment = nextSegments.at(-1) ?? firstSegment;
    const totalScheduledMinutes = nextSegments.reduce(
      (total, segment) => total + Math.max(0, minutesSinceUtcMidnight(segment.endAt) - minutesSinceUtcMidnight(segment.startAt)),
      0,
    );

    return {
      ...task,
      startAt: firstSegment.startAt,
      endAt: lastSegment.endAt,
      durationLabel: formatDurationMinutesLabel(totalScheduledMinutes),
      executionPlan: buildExecutionPlanFromSegments(nextSegments),
      scheduleSegments: nextSegments,
    };
  });
}

export function clampTimelineBlockEditRange(
  tasks                ,
  taskId        ,
  blockId        ,
  handle                           ,
  proposedStartAt        ,
  proposedEndAt        ,
) {
  const task = tasks.find((item) => item.id === taskId);
  const currentSegment = task?.scheduleSegments.find((segment) => segment.id === blockId);
  if (!currentSegment) {
    return {
      startAt: proposedStartAt,
      endAt: proposedEndAt,
    };
  }

  const dayId = toUtcDateId(currentSegment.startAt);
  const currentStartMinutes = minutesSinceUtcMidnight(currentSegment.startAt);
  const currentEndMinutes = minutesSinceUtcMidnight(currentSegment.endAt);
  const proposedStartMinutes = minutesSinceUtcMidnight(proposedStartAt);
  const proposedEndMinutes = minutesSinceUtcMidnight(proposedEndAt);
  const proposedDurationMinutes = Math.max(
    TIMELINE_EDIT_MIN_DURATION_MINUTES,
    proposedEndMinutes - proposedStartMinutes,
  );
  const siblingSegments = tasks
    .flatMap((candidateTask) =>
      candidateTask.scheduleSegments.map((segment) => ({
        id: segment.id,
        dayId: toUtcDateId(segment.startAt),
        startMinutes: minutesSinceUtcMidnight(segment.startAt),
        endMinutes: minutesSinceUtcMidnight(segment.endAt),
      })),
    )
    .filter((segment) => segment.id !== blockId && segment.dayId === dayId)
    .sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);

  if (handle === "body") {
    const gaps                                                      = [];
    let cursor = 0;

    for (const segment of siblingSegments) {
      if (segment.startMinutes - cursor >= proposedDurationMinutes) {
        gaps.push({
          startMinutes: cursor,
          endMinutes: segment.startMinutes,
        });
      }
      cursor = Math.max(cursor, segment.endMinutes);
    }

    if (TIMELINE_DAY_MINUTES - cursor >= proposedDurationMinutes) {
      gaps.push({
        startMinutes: cursor,
        endMinutes: TIMELINE_DAY_MINUTES,
      });
    }

    if (!gaps.length) {
      return {
        startAt: currentSegment.startAt,
        endAt: currentSegment.endAt,
      };
    }

    const bestGap = gaps
      .map((gap) => {
        const candidateStartMinutes = clampTimelineMinutes(
          proposedStartMinutes,
          gap.startMinutes,
          gap.endMinutes - proposedDurationMinutes,
        );
        return {
          gap,
          candidateStartMinutes,
          distance: Math.abs(candidateStartMinutes - proposedStartMinutes),
        };
      })
      .sort((left, right) => left.distance - right.distance || left.gap.startMinutes - right.gap.startMinutes)[0];

    return {
      startAt: toUtcIsoAtDateId(dayId, bestGap.candidateStartMinutes),
      endAt: toUtcIsoAtDateId(dayId, bestGap.candidateStartMinutes + proposedDurationMinutes),
    };
  }

  if (handle === "top") {
    const previousEndMinutes = siblingSegments.reduce((latest, segment) => {
      if (segment.endMinutes <= currentStartMinutes) {
        return Math.max(latest, segment.endMinutes);
      }
      return latest;
    }, 0);
    const clampedStartMinutes = clampTimelineMinutes(
      proposedStartMinutes,
      previousEndMinutes,
      proposedEndMinutes - TIMELINE_EDIT_MIN_DURATION_MINUTES,
    );
    return {
      startAt: toUtcIsoAtDateId(dayId, clampedStartMinutes),
      endAt: toUtcIsoAtDateId(dayId, proposedEndMinutes),
    };
  }

  const nextStartMinutes = siblingSegments.reduce((earliest, segment) => {
    if (segment.startMinutes >= currentEndMinutes) {
      return Math.min(earliest, segment.startMinutes);
    }
    return earliest;
  }, TIMELINE_DAY_MINUTES);
  const clampedEndMinutes = clampTimelineMinutes(
    proposedEndMinutes,
    proposedStartMinutes + TIMELINE_EDIT_MIN_DURATION_MINUTES,
    nextStartMinutes,
  );
  return {
    startAt: toUtcIsoAtDateId(dayId, proposedStartMinutes),
    endAt: toUtcIsoAtDateId(dayId, clampedEndMinutes),
  };
}

function resolveDeviceWidthPx() {
  const maybeWx = globalThis                         
          
                                                    
                                                        
      
   ;

  if (typeof maybeWx.wx?.getWindowInfo === "function") {
    return maybeWx.wx.getWindowInfo().windowWidth;
  }

  if (typeof maybeWx.wx?.getSystemInfoSync === "function") {
    return maybeWx.wx.getSystemInfoSync().windowWidth;
  }

  return DEFAULT_DEVICE_WIDTH_PX;
}

function convertRpxToPx(valueRpx        ) {
  return Math.round((valueRpx * resolveDeviceWidthPx()) / 750);
}

function resolveActiveDateId(tasks                ) {
  const validTasks = tasks.filter((task) => task.startAt && task.endAt && hasScheduleSegments(task));
  const activeCandidates = validTasks.filter((task) => task.status !== "done");
  const source = activeCandidates.length > 0 ? activeCandidates : validTasks;
  const earliest = [...source].sort((left, right) => left.startAt.localeCompare(right.startAt))[0];
  return earliest ? toUtcDateId(earliest.startAt) : createFallbackDateId(tasks);
}

function addUtcDays(dateId        , offsetDays        ) {
  const [year, month, day] = dateId.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addUtcHoursToIso(value        , offsetHours        ) {
  const date = parseUtcDate(value);
  date.setUTCHours(date.getUTCHours() + offsetHours);
  return date.toISOString();
}

function addUtcDaysToIso(value        , offsetDays        ) {
  const date = parseUtcDate(value);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString();
}

function addUtcMonthsToIso(value        , offsetMonths        ) {
  const date = parseUtcDate(value);
  date.setUTCMonth(date.getUTCMonth() + offsetMonths);
  return date.toISOString();
}

function startOfUtcMonthIso(dateId        ) {
  const [year, month] = dateId.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();
}

function resolvePlanningSlotHeightRpx(period                      ) {
  return period === "day"
    ? 60 * PLANNING_DAY_MINUTE_HEIGHT_RPX
    : period === "year"
      ? PLANNING_YEAR_SLOT_HEIGHT_RPX
      : PLANNING_RANGE_SLOT_HEIGHT_RPX;
}

function resolvePlanningViewportSlotCount(period                      ) {
  switch (period) {
    case "day":
      return 24;
    case "week":
      return 7;
    case "month":
      return 30;
    case "quarter":
      return 90;
    case "year":
      return 12;
    default:
      return 24;
  }
}

function resolvePlanningSlotUnit(period                      )                       {
  return period === "day" ? "hour" : period === "year" ? "month" : "day";
}

function shiftPlanningBoundaryIso(value        , unit                      , offset        ) {
  if (unit === "hour") {
    return addUtcHoursToIso(value, offset);
  }

  if (unit === "month") {
    return addUtcMonthsToIso(value, offset);
  }

  return addUtcDaysToIso(value, offset);
}

function diffUtcHours(startAt        , endAt        ) {
  return Math.max(0, Math.round((parseUtcDate(endAt).getTime() - parseUtcDate(startAt).getTime()) / 3600000));
}

function diffUtcDays(startAt        , endAt        ) {
  return Math.max(0, Math.round((parseUtcDate(endAt).getTime() - parseUtcDate(startAt).getTime()) / 86400000));
}

function diffUtcMonths(startAt        , endAt        ) {
  const start = parseUtcDate(startAt);
  const end = parseUtcDate(endAt);
  return Math.max(0, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()));
}

function resolvePlanningAnchorStartAt(activeDateId        , activePeriod                      ) {
  if (activePeriod === "year") {
    return startOfUtcMonthIso(activeDateId);
  }

  return `${activeDateId}T00:00:00.000Z`;
}

function resolvePlanningDefaultLoadedEndAt(anchorStartAt        , activePeriod                      ) {
  const slotUnit = resolvePlanningSlotUnit(activePeriod);
  const viewportSlotCount = resolvePlanningViewportSlotCount(activePeriod);
  return shiftPlanningBoundaryIso(anchorStartAt, slotUnit, viewportSlotCount);
}

function formatPlanningCalendarDateLabel(date      ) {
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

function formatPlanningRangeLabel(activeDateId        , activePeriod                      ) {
  const anchorStartAt = resolvePlanningAnchorStartAt(activeDateId, activePeriod);
  const anchorEndAt = resolvePlanningDefaultLoadedEndAt(anchorStartAt, activePeriod);
  const anchorStart = parseUtcDate(anchorStartAt);
  const anchorEnd = parseUtcDate(addUtcDaysToIso(anchorEndAt, -1));

  if (activePeriod === "day") {
    return formatPlanningCalendarDateLabel(anchorStart);
  }

  return `${formatPlanningCalendarDateLabel(anchorStart)} - ${formatPlanningCalendarDateLabel(anchorEnd)}`;
}

function intervalsOverlap(startAt        , endAt        , rangeStartAt        , rangeEndAt        ) {
  return parseUtcDate(startAt).getTime() < parseUtcDate(rangeEndAt).getTime() &&
    parseUtcDate(endAt).getTime() > parseUtcDate(rangeStartAt).getTime();
}

function clampIsoRange(startAt        , endAt        , rangeStartAt        , rangeEndAt        ) {
  const clampedStart = new Date(Math.max(parseUtcDate(startAt).getTime(), parseUtcDate(rangeStartAt).getTime())).toISOString();
  const clampedEnd = new Date(Math.min(parseUtcDate(endAt).getTime(), parseUtcDate(rangeEndAt).getTime())).toISOString();
  return { startAt: clampedStart, endAt: clampedEnd };
}

function formatPlanningHourSlotLabel(slotStartAt        , index        , slotCount        ) {
  const date = parseUtcDate(slotStartAt);
  const minuteLabel = formatMinutesLabel(date.getUTCHours() * 60 + date.getUTCMinutes());
  if (index === slotCount && slotCount === 24) {
    return "24:00";
  }

  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && index > 0) {
    return `${date.getUTCMonth() + 1}.${date.getUTCDate()} 00:00`;
  }

  return minuteLabel;
}

function formatPlanningDaySlotLabel(slotStartAt        , activePeriod                      ) {
  const date = parseUtcDate(slotStartAt);
  if (activePeriod === "week") {
    return `${WEEKDAY_LABELS[date.getUTCDay()]} ${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
  }

  return `${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
}

function formatPlanningMonthSlotLabel(slotStartAt        , index        ) {
  const date = parseUtcDate(slotStartAt);
  if (index === 0 || date.getUTCMonth() === 0) {
    return `${date.getUTCFullYear()}.${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  return `${date.getUTCMonth() + 1} 月`;
}

function startOfUtcDayIso(value        ) {
  const date = parseUtcDate(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function startOfUtcMonthFromIso(value        ) {
  const date = parseUtcDate(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
}

function buildTimelineDays(activeDateId        )                    {
  const dayOffsets = Array.from(
    { length: TIMELINE_PAST_DAYS + TIMELINE_FUTURE_DAYS + 1 },
    (_, index) => index - TIMELINE_PAST_DAYS,
  );

  return dayOffsets.map((offset) => {
    const dateId = addUtcDays(activeDateId, offset);
    const [year, month, day] = dateId.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return {
      id: dateId,
      weekLabel: WEEKDAY_LABELS[date.getUTCDay()],
      dateLabel: String(date.getUTCDate()),
      isActive: offset === 0,
      isPast: offset < 0,
      blocks: [],
    };
  });
}

function normalizeTimelineVisibleDayCount(value         ) {
  return TIMELINE_VISIBLE_DAY_COUNT_OPTIONS.includes(value)
    ? value
    : TIMELINE_DEFAULT_VISIBLE_DAY_COUNT;
}

function buildTimelineVisibleDayCountOptions(activeVisibleDayCount        ) {
  return TIMELINE_VISIBLE_DAY_COUNT_OPTIONS.map((value) => ({
    id: `timeline-visible-days-${value}`,
    label: `${value}天`,
    value,
    isActive: value === activeVisibleDayCount,
  }));
}

function resolveTimelineDayColumnWidthRpx(visibleDayCount        ) {
  return Math.round((TIMELINE_DAY_COLUMN_WIDTH_RPX * TIMELINE_DEFAULT_VISIBLE_DAY_COUNT) / visibleDayCount);
}

function buildTimelineView(tasks                , requestedVisibleDayCount = TIMELINE_DEFAULT_VISIBLE_DAY_COUNT)                   {
  const scheduledTasks = tasks.filter(hasScheduleSegments);
  const visibleDayCount = normalizeTimelineVisibleDayCount(requestedVisibleDayCount);
  const dayColumnWidthRpx = resolveTimelineDayColumnWidthRpx(visibleDayCount);
  const activeDateId = resolveActiveDateId(tasks);
  const days = buildTimelineDays(activeDateId);
  const rawBlocks = scheduledTasks
    .flatMap((task) => {
      const rawSegments = Array.isArray(task.scheduleSegments) ? task.scheduleSegments : [];
      const segments = sortScheduleSegments(
        rawSegments.length > 0
          ? rawSegments
          : [
              {
                id: task.id,
                startAt: task.startAt,
                endAt: task.endAt,
                label: task.durationLabel,
              },
            ],
      );
      return segments.map                   ((segment) => {
        const startMinutes = minutesSinceUtcMidnight(segment.startAt);
        const endMinutes = minutesSinceUtcMidnight(segment.endAt);
        return {
          id: `timeline-${segment.id}`,
          scheduleBlockId: segment.id,
          dayId: toUtcDateId(segment.startAt),
          taskId: task.id,
          title: task.title,
          status: task.status,
          startMinutes,
          endMinutes,
          startLabel: formatMinutesLabel(startMinutes),
          endLabel: formatMinutesLabel(endMinutes),
          topRpx: startMinutes * TIMELINE_MINUTE_HEIGHT_RPX,
          heightRpx: Math.max((endMinutes - startMinutes) * TIMELINE_MINUTE_HEIGHT_RPX, 72),
          leftRpx: TIMELINE_BLOCK_SIDE_MARGIN_RPX,
          rightRpx: TIMELINE_BLOCK_SIDE_MARGIN_RPX,
          deadlineLabel: task.deadlineLabel,
        };
      });
    })
    .filter((block) => days.some((day) => day.id === block.dayId))
    .sort((left, right) =>
      left.dayId === right.dayId
        ? left.startLabel.localeCompare(right.startLabel)
        : left.dayId.localeCompare(right.dayId),
    );
  const blocks = days.flatMap((day) =>
    assignTimelineBlockLanes(rawBlocks.filter((block) => block.dayId === day.id), dayColumnWidthRpx),
  );
  const blocksForActiveDate = blocks.filter((block) => block.dayId === activeDateId);

  const viewportStartMinutes = 0;
  const totalHeightRpx = TIMELINE_DAY_MINUTES * TIMELINE_MINUTE_HEIGHT_RPX;
  const activeDayIndex = days.findIndex((day) => day.id === activeDateId);
  const initialScrollTopPx =
    blocksForActiveDate.length > 0
      ? convertRpxToPx(blocksForActiveDate[0].topRpx)
      : 0;

  const daysWithBlocks = days.map((day) => ({
    ...day,
    blocks: blocks.filter((block) => block.dayId === day.id),
  }));
  const activeDayBlocks = daysWithBlocks[activeDayIndex]?.blocks ?? [];
  const coveredMinutes = scheduledTasks.reduce((total, task) => {
    const segments = Array.isArray(task.scheduleSegments) && task.scheduleSegments.length > 0
      ? task.scheduleSegments
      : [{ id: task.id, startAt: task.startAt, endAt: task.endAt, label: task.durationLabel }];
    return total + segments.reduce(
      (segmentTotal, segment) =>
        segmentTotal + Math.max(0, minutesSinceUtcMidnight(segment.endAt) - minutesSinceUtcMidnight(segment.startAt)),
      0,
    );
  }, 0);
  const milestoneCount = tasks.reduce(
    (total, task) => total + (Array.isArray(task.executionPlan) ? task.executionPlan.length : 0),
    0,
  );
  const intensityScore = tasks.length > 0 ? Math.round((scheduledTasks.length / tasks.length) * 100) : 0;

  return {
    visibleDayCount,
    visibleDayCountOptions: buildTimelineVisibleDayCountOptions(visibleDayCount),
    dayColumnWidthRpx,
    activeDateId,
    activeDayAnchorId: `timeline-day-${activeDateId}`,
    activeDayIndex,
    viewportStartLabel: formatMinutesLabel(viewportStartMinutes),
    viewportEndLabel: formatMinutesLabel(TIMELINE_DAY_MINUTES),
    viewportStartMinutes,
    viewportDurationMinutes: TIMELINE_DAY_MINUTES,
    totalHeightRpx,
    initialScrollLeftPx: convertRpxToPx(activeDayIndex * dayColumnWidthRpx),
    initialScrollTopPx,
    days: daysWithBlocks,
    timeSlots: Array.from({ length: Math.floor(TIMELINE_DAY_MINUTES / 60) + 1 }, (_, index) => ({
      id: `slot-${index}`,
      label: formatMinutesLabel(index * 60),
      topRpx: index * 60 * TIMELINE_MINUTE_HEIGHT_RPX,
    })),
    blocks,
    overviewItems: activeDayBlocks.slice(0, 3).map((block) => ({
      id: `overview-${block.id}`,
      title: block.title,
      timeLabel: `${block.startLabel} - ${block.endLabel}`,
      statusLabel: block.status === "scheduled" ? "实验块" : "关键节点",
    })),
    analysisItems: [
      {
        id: "analysis-task-count",
        label: "实验任务",
        value: `共 ${tasks.length} 项任务`,
      },
      {
        id: "analysis-covered-hours",
        label: "总覆盖时间",
        value: `${Math.max(1, Math.round(coveredMinutes / 60))} 小时`,
      },
      {
        id: "analysis-milestones",
        label: "关键节点",
        value: `${milestoneCount} 个`,
      },
      {
        id: "analysis-intensity",
        label: "强度评分",
        value: `${intensityScore}%`,
      },
    ],
  };
}

function toWeekStartDateId(dateId        ) {
  const [year, month, day] = dateId.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return toUtcDateId(date.toISOString());
}

function getWeekOfMonth(date      ) {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const offset = (firstDay.getUTCDay() + 6) % 7;
  return Math.floor((date.getUTCDate() + offset - 1) / 7);
}

function buildPlanningView(
  tasks                ,
  activeDateId        ,
  activePeriod                       = "day",
  options   
                           
                         
    = {},
)                   {
  const slotUnit = resolvePlanningSlotUnit(activePeriod);
  const viewportSlotCount = resolvePlanningViewportSlotCount(activePeriod);
  const slotHeightRpx = resolvePlanningSlotHeightRpx(activePeriod);
  const anchorStartAt = resolvePlanningAnchorStartAt(activeDateId, activePeriod);
  const loadedStartAt = options.loadedStartAt ?? anchorStartAt;
  const loadedEndAt = options.loadedEndAt ?? resolvePlanningDefaultLoadedEndAt(anchorStartAt, activePeriod);
  const loadedSlotCount = slotUnit === "hour"
    ? diffUtcHours(loadedStartAt, loadedEndAt)
    : slotUnit === "month"
      ? diffUtcMonths(loadedStartAt, loadedEndAt)
      : diffUtcDays(loadedStartAt, loadedEndAt);

  let timeSlots                         = [];
  if (slotUnit === "hour") {
    timeSlots = Array.from({ length: loadedSlotCount + 1 }, (_, index) => {
      const slotStartAt = addUtcHoursToIso(loadedStartAt, index);
      return {
        id: `planning-day-slot-${slotStartAt}`,
        label: formatPlanningHourSlotLabel(slotStartAt, index, loadedSlotCount),
        topRpx: index * slotHeightRpx,
        heightRpx: slotHeightRpx,
        startAt: slotStartAt,
        endAt: slotStartAt,
      };
    });
  } else if (slotUnit === "day") {
    timeSlots = Array.from({ length: loadedSlotCount }, (_, index) => {
      const slotStartAt = addUtcDaysToIso(loadedStartAt, index);
      const slotEndAt = addUtcDaysToIso(slotStartAt, 1);
      return {
        id: `planning-${activePeriod}-slot-${slotStartAt}`,
        label: formatPlanningDaySlotLabel(slotStartAt, activePeriod),
        topRpx: index * slotHeightRpx,
        heightRpx: slotHeightRpx,
        startAt: slotStartAt,
        endAt: slotEndAt,
      };
    });
  } else {
    timeSlots = Array.from({ length: loadedSlotCount }, (_, index) => {
      const slotStartAt = addUtcMonthsToIso(loadedStartAt, index);
      const slotEndAt = addUtcMonthsToIso(slotStartAt, 1);
      return {
        id: `planning-year-slot-${slotStartAt}`,
        label: formatPlanningMonthSlotLabel(slotStartAt, index),
        topRpx: index * slotHeightRpx,
        heightRpx: slotHeightRpx,
        startAt: slotStartAt,
        endAt: slotEndAt,
      };
    });
  }

  const totalHeightRpx = loadedSlotCount * slotHeightRpx;

  const selectedTasks = tasks
    .filter(hasScheduleSegments)
    .map((task) => {
      const rawSegments = Array.isArray(task.scheduleSegments) && task.scheduleSegments.length > 0
        ? task.scheduleSegments
        : [{ id: `${task.id}-fallback`, startAt: task.startAt, endAt: task.endAt, label: task.durationLabel }];
      const bars = rawSegments
        .filter((segment) => intervalsOverlap(segment.startAt, segment.endAt, loadedStartAt, loadedEndAt))
        .map                 ((segment, index) => {
          const clamped = clampIsoRange(segment.startAt, segment.endAt, loadedStartAt, loadedEndAt);

          if (slotUnit === "hour") {
            const topMinutes = Math.max(
              0,
              Math.round((parseUtcDate(clamped.startAt).getTime() - parseUtcDate(loadedStartAt).getTime()) / 60000),
            );
            const heightMinutes = Math.max(
              TIMELINE_EDIT_MIN_DURATION_MINUTES,
              Math.round((parseUtcDate(clamped.endAt).getTime() - parseUtcDate(clamped.startAt).getTime()) / 60000),
            );
            return {
              id: `${task.id}-bar-${index + 1}`,
              taskId: task.id,
              label: segment.label,
              topRpx: topMinutes * PLANNING_DAY_MINUTE_HEIGHT_RPX,
              heightRpx: Math.max(heightMinutes * PLANNING_DAY_MINUTE_HEIGHT_RPX, 72),
            };
          }

          if (slotUnit === "day") {
            const clampedStartDay = startOfUtcDayIso(clamped.startAt);
            const clampedEndDay = startOfUtcDayIso(addUtcHoursToIso(clamped.endAt, clamped.endAt.endsWith("00:00:00.000Z") ? -1 : 0));
            const dayOffset = diffUtcDays(loadedStartAt, clampedStartDay);
            const span = Math.max(1, diffUtcDays(clampedStartDay, addUtcDaysToIso(clampedEndDay, 1)));
            return {
              id: `${task.id}-bar-${index + 1}`,
              taskId: task.id,
              label: `${formatPlanningDaySlotLabel(clampedStartDay, activePeriod)} ${segment.label}`,
              topRpx: dayOffset * slotHeightRpx + 18,
              heightRpx: Math.max(span * slotHeightRpx - 28, 74),
            };
          }

          const clampedStartMonth = startOfUtcMonthFromIso(clamped.startAt);
          const clampedEndMonth = startOfUtcMonthFromIso(addUtcDaysToIso(clamped.endAt, -1));
          const monthOffset = diffUtcMonths(loadedStartAt, clampedStartMonth);
          const span = Math.max(1, diffUtcMonths(clampedStartMonth, addUtcMonthsToIso(clampedEndMonth, 1)));
          return {
            id: `${task.id}-bar-${index + 1}`,
            taskId: task.id,
            label: formatPlanningMonthSlotLabel(clampedStartMonth, monthOffset),
            topRpx: monthOffset * slotHeightRpx + 14,
            heightRpx: Math.max(span * slotHeightRpx - 22, 64),
          };
        });

      return {
        id: task.id,
        title: task.title,
        subtitle: task.durationLabel,
        bars,
        startAt: task.startAt,
      };
    })
    .filter((task) => task.bars.length > 0)
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .map                        (({ id, title, subtitle, bars }) => ({
      id,
      title,
      subtitle,
      bars,
    }));

  return {
    activeDateId,
    activePeriod,
    periods: PLANNING_PERIODS.map((item) => ({ ...item })),
    rangeLabel: formatPlanningRangeLabel(activeDateId, activePeriod),
    totalHeightRpx,
    viewportSlotCount,
    viewportHeightRpx: PLANNING_GANTT_VIEWPORT_HEIGHT_RPX,
    slotHeightRpx,
    slotUnit,
    loadedStartAt,
    loadedEndAt,
    initialScrollTopPx: 0,
    timeSlots,
    taskColumns: selectedTasks,
    emptyState: "当前窗口还没有已排期任务，继续向前后滚动或先安排任务生成排期。",
  };
}

function buildScheduleItems(tasks                ) {
  return tasks.filter(hasScheduleSegments);
}

function buildHomeSurfaceStates(
  scheduleView                   ,
  kanbanView                 ,
  planningView                  ,
  timelineView                  ,
)                    {
  const summaryMetrics = timelineView.analysisItems.map((item) => ({
    id: item.id,
    label: item.label,
    value: item.value,
  }));

  return {
    schedule: {
      id: "schedule",
      header: {
        title: scheduleView.title,
        subtitle: scheduleView.subtitle,
      },
      scheduleSummary: {
        title: "今日节奏",
        expandable: true,
        expanded: false,
        compactMetrics: summaryMetrics.slice(0, 3),
        expandedMetrics: summaryMetrics.slice(3),
        metrics: summaryMetrics,
      },
    },
    kanban: {
      id: "kanban",
      header: {
        title: kanbanView.title,
        subtitle: kanbanView.subtitle,
      },
      scheduleSummary: null,
    },
    planning: {
      id: "planning",
      header: {
        title: "排期",
        subtitle: planningView.rangeLabel,
      },
      scheduleSummary: null,
    },
  };
}

function syncHomeDerivedViews(
  home               ,
  tasks                ,
  activePeriod = home.planningView.activePeriod,
  visibleDayCount = home.timelineView.visibleDayCount,
) {
  const scheduleView = createScheduleView(buildScheduleItems(tasks));
  const kanbanView = createKanbanView(tasks);
  const timelineView = buildTimelineView(tasks, visibleDayCount);
  const previousPlanningView = home.planningView;
  const previousTimelineActiveDateId = home.timelineView.activeDateId;
  const previousAnchorStartAt = resolvePlanningAnchorStartAt(previousPlanningView.activeDateId, activePeriod);
  const previousAnchorEndAt = resolvePlanningDefaultLoadedEndAt(previousAnchorStartAt, activePeriod);
  const shouldFollowTimelineActiveDate =
    previousPlanningView.activePeriod === activePeriod &&
    previousPlanningView.activeDateId === previousTimelineActiveDateId &&
    previousPlanningView.loadedStartAt === previousAnchorStartAt &&
    previousPlanningView.loadedEndAt === previousAnchorEndAt;
  const planningActiveDateId = shouldFollowTimelineActiveDate
    ? timelineView.activeDateId
    : previousPlanningView.activeDateId ?? timelineView.activeDateId;
  const planningView = buildPlanningView(
    tasks,
    planningActiveDateId,
    activePeriod,
    previousPlanningView && previousPlanningView.activePeriod === activePeriod && !shouldFollowTimelineActiveDate
      ? {
          loadedStartAt: previousPlanningView.loadedStartAt,
          loadedEndAt: previousPlanningView.loadedEndAt,
        }
      : {},
  );
  home.tasks = tasks;
  home.scheduleView = scheduleView;
  home.kanbanView = kanbanView;
  home.timelineView = timelineView;
  home.planningView = planningView;
  home.surfaceStates = buildHomeSurfaceStates(scheduleView, kanbanView, planningView, timelineView);
  return home;
}

export function buildHomePage(input                                                    = {})                {
  const tasks = input.tasks ?? DEFAULT_TASKS;
  const timelineView = buildTimelineView(tasks, input.timelineVisibleDayCount);
  const scheduleView = createScheduleView(buildScheduleItems(tasks));
  const kanbanView = createKanbanView(tasks);
  const planningView = buildPlanningView(tasks, timelineView.activeDateId);
  const home                = {
    brand: "糖蟹",
    title: "糖蟹",
    subtitle: "自动排期和按时提醒",
    tabs: createTabs(),
    activeTab: input.activeTab ?? "schedule",
    primaryActionText: "安排任务",
    surfaceStates: buildHomeSurfaceStates(scheduleView, kanbanView, planningView, timelineView),
    scheduleView,
    kanbanView,
    timelineView,
    planningView,
    arrangeSheet: createArrangeSheet({
      history: [
        {
          id: "home-history-1",
          title: "帮我拆解这个任务",
          summary: "系统会先追问 deadline 和时长。",
          updatedAt: "2026-04-08 09:40",
        },
      ],
    }),
    tasks,
  };
  home.refresh = (confirmedBlocks) => refreshHomePage(home, confirmedBlocks);
  return home;
}

function toHomeTaskCard(block   
             
                 
                
                  
                
                          
                      
 )               {
  return {
    id: block.taskId,
    title: block.title,
    summary: "已从安排任务确认到日程，可继续查看执行建议并调整优先级。",
    startAt: block.startAt,
    endAt: block.endAt,
    deadlineAt: block.endAt,
    status: "scheduled",
    deadlineLabel: formatRelativeDeadlineLabel(block.endAt),
    durationLabel: `${Math.max(1, Math.round(block.durationMinutes / 60))} 小时`,
    priorityLabel: "P1",
    importanceReason: `confirmed-block=${block.id}`,
    categoryId: "scheduled",
    categoryTitle: "已安排任务",
    sourceLabel: "安排任务",
    executionPlan: [
      {
        id: `${block.id}-plan-1`,
        label: `${formatRelativeDeadlineLabel(block.startAt)} ${formatMinutesLabel(minutesSinceUtcMidnight(block.startAt))} - ${formatMinutesLabel(minutesSinceUtcMidnight(block.endAt))}`,
        statusLabel: "已排期",
      },
    ],
    suggestions: ["按照当前排期推进，如有冲突可重新安排该任务。"],
    scheduleSegments: [
      {
        id: block.id,
        startAt: block.startAt,
        endAt: block.endAt,
        label: `${formatMinutesLabel(minutesSinceUtcMidnight(block.startAt))} - ${formatMinutesLabel(minutesSinceUtcMidnight(block.endAt))}`,
      },
    ],
  };
}

export function refreshHomePage(
  home               ,
  confirmedBlocks         
               
                   
                  
                    
                  
                            
                        
    ,
) {
  const refreshedTasks = [...home.tasks];

  for (const block of confirmedBlocks) {
    const nextTask = toHomeTaskCard(block);
    const existingIndex = refreshedTasks.findIndex((task) => task.id === nextTask.id);

    if (existingIndex >= 0) {
      refreshedTasks[existingIndex] = nextTask;
      continue;
    }

    refreshedTasks.unshift(nextTask);
  }

  syncHomeDerivedViews(home, refreshedTasks);
  home.arrangeSheet = createArrangeSheet({
    draftText: home.arrangeSheet.draftText,
    attachments: home.arrangeSheet.attachments,
    history: [
      {
        id: `refresh-${confirmedBlocks.length || 1}`,
        title: confirmedBlocks[0]?.title ?? "任务已安排",
        summary: "任务已确认排期，首页已刷新。",
        updatedAt: "2026-04-08 10:00",
      },
      ...home.arrangeSheet.history,
    ],
  });

  return home;
}

export function replaceHomeTasks(home               , tasks                ) {
  return syncHomeDerivedViews(home, tasks);
}

export function switchHomeTab(home               , tabId           ) {
  home.activeTab = tabId;
  return home;
}

export function switchHomePlanningPeriod(home               , period                      ) {
  home.planningView = buildPlanningView(home.tasks, home.planningView.activeDateId, period);
  home.surfaceStates.planning.header.subtitle = home.planningView.rangeLabel;
  return home;
}

export function switchHomeTimelineVisibleDayCount(home               , visibleDayCount        ) {
  return syncHomeDerivedViews(home, home.tasks, home.planningView.activePeriod, visibleDayCount);
}

export function extendHomePlanningWindow(home               , direction                             ) {
  const { planningView } = home;
  const offset = planningView.viewportSlotCount;
  const loadedStartAt =
    direction === "before"
      ? shiftPlanningBoundaryIso(planningView.loadedStartAt, planningView.slotUnit, -offset)
      : planningView.loadedStartAt;
  const loadedEndAt =
    direction === "after"
      ? shiftPlanningBoundaryIso(planningView.loadedEndAt, planningView.slotUnit, offset)
      : planningView.loadedEndAt;

  home.planningView = buildPlanningView(home.tasks, planningView.activeDateId, planningView.activePeriod, {
    loadedStartAt,
    loadedEndAt,
  });
  home.surfaceStates.planning.header.subtitle = home.planningView.rangeLabel;

  return {
    addedSlotCount: offset,
    direction,
  };
}

export function openArrangeSheet(home               ) {
  home.arrangeSheet = createArrangeSheet({
    draftText: home.arrangeSheet.draftText,
    attachments: home.arrangeSheet.attachments,
    history: home.arrangeSheet.history,
  });
  return home;
}

export { createHomePageRuntime };

registerHomePage();

                           
                                               
                                 
                                                     
                                
                                                              
                                                                   
                                                                 
                                
                           
                   
                    
                   
           
                          
                   
                    
                                      
                         
                          
                        
                        
                      
                     
                                     
           
                                   
                              
                                     
  

const TIMELINE_EDIT_LONG_PRESS_MS = 1000;
const TIMELINE_EDIT_SNAP_MINUTES = 15;
const TIMELINE_EDIT_MIN_DURATION_MINUTES = 15;

function buildRegisteredPageData(runtime                                          ) {
  const selectedTask = runtime.state.selectedTaskId
    ? runtime.state.home.tasks.find((task) => task.id === runtime.state.selectedTaskId) ?? null
    : null;
  return {
    home: runtime.state.home,
    activeTab: runtime.state.home.activeTab,
    timelineScrollLeft: runtime.state.home.timelineView.initialScrollLeftPx,
    timelineHeaderOffsetPx: runtime.state.home.timelineView.initialScrollLeftPx,
    timelineDayRangeMenuOpen: false,
    planningScrollTop: runtime.state.home.planningView.initialScrollTopPx,
    scheduleEmptyState: runtime.state.home.scheduleView.emptyState,
    kanbanEmptyState: runtime.state.home.kanbanView.subtitle,
    loading: runtime.state.loading,
    toastVisible: false,
    toastMessage: "",
    toastTone: "notice",
    sheetVisible: false,
    sheetAnimationState: "closed",
    arrangeTab: runtime.state.arrangeTab,
    attachmentPickerOpen: runtime.state.attachmentPickerOpen,
    draftText: runtime.state.draftText,
    answerText: runtime.state.answerText,
    canSubmitDraft: runtime.state.draftText.trim().length > 0,
    canSubmitAnswer: runtime.state.answerText.trim().length > 0,
    runtimeApiBaseUrl: runtime.state.runtimeConfig.apiBaseUrl,
    runtimeApiBaseUrlDraft: runtime.state.runtimeConfig.apiBaseUrlDraft,
    stage: runtime.state.stage,
    nextQuestion: runtime.state.nextQuestion,
    confirmedBlocks: runtime.state.confirmedBlocks,
    scheduleSummaryExpanded: false,
    taskDetailVisible: runtime.state.taskDetailVisible,
    timelineEditingBlockId: null,
    timelineEditingHandle: "",
    selectedTaskDetail: selectedTask
      ? createTaskDetailPage({
          title: selectedTask.title,
          taskName: selectedTask.title,
          summary: selectedTask.summary,
          content: selectedTask.summary,
          timeRangeLabel: formatTaskTimeRangeLabel(selectedTask.startAt, selectedTask.endAt),
          parentTaskTitle: selectedTask.parentTaskTitle,
          categoryTitle: selectedTask.categoryTitle,
          statusLabel: formatTaskStatusLabel(selectedTask.status),
          deadlineLabel: selectedTask.deadlineLabel,
          durationLabel: selectedTask.durationLabel,
          priorityLabel: selectedTask.priorityLabel,
          sourceLabel: selectedTask.sourceLabel,
          executionPlan: selectedTask.executionPlan,
          suggestions: selectedTask.suggestions,
          aiSuggestions: selectedTask.suggestions,
        })
      : null,
  };
}

function formatTaskStatusLabel(status                        ) {
  switch (status) {
    case "scheduled":
      return "已安排";
    case "needs_info":
      return "待补信息";
    case "done":
      return "已完成";
    case "overdue":
      return "已逾期";
    case "schedulable":
      return "待排期";
    default:
      return "待安排";
  }
}

function clearToastTimer(page                    ) {
  if (page._toastTimer) {
    clearTimeout(page._toastTimer);
    page._toastTimer = null;
  }
}

function clearSheetAnimationTimers(page                    ) {
  if (page._sheetAnimationTimer) {
    clearTimeout(page._sheetAnimationTimer);
    page._sheetAnimationTimer = null;
  }

  if (page._sheetAnimationFrameTimer) {
    clearTimeout(page._sheetAnimationFrameTimer);
    page._sheetAnimationFrameTimer = null;
  }
}

function syncToastFromRuntime(page                    , runtime                                          ) {
  const message = runtime.state.error ?? runtime.state.notice;
  const tone = runtime.state.error ? "error" : "notice";
  if (!message) {
    return;
  }

  const toastKey = `${tone}:${message}`;
  if (page._lastToastKey === toastKey) {
    runtime.clearFeedback();
    return;
  }

  page._lastToastKey = toastKey;
  clearToastTimer(page);
  page.setData({
    toastVisible: true,
    toastMessage: message,
    toastTone: tone,
  });
  runtime.clearFeedback();
  page._toastTimer = setTimeout(() => {
    page.setData({
      toastVisible: false,
      toastMessage: "",
    });
    page._toastTimer = null;
    page._lastToastKey = null;
  }, 3000);
}

function syncRuntimeToPage(page                    , runtime                                          ) {
  const currentData = page.data ?? {};
  page.setData({
    ...buildRegisteredPageData(runtime),
    toastVisible: currentData.toastVisible ?? false,
    toastMessage: currentData.toastMessage ?? "",
    toastTone: currentData.toastTone ?? "notice",
    sheetVisible: currentData.sheetVisible ?? false,
    sheetAnimationState: currentData.sheetAnimationState ?? "closed",
    timelineScrollLeft:
      typeof currentData.timelineScrollLeft === "number"
        ? currentData.timelineScrollLeft
        : runtime.state.home.timelineView.initialScrollLeftPx,
    timelineEditingBlockId:
      typeof currentData.timelineEditingBlockId === "string" ? currentData.timelineEditingBlockId : null,
    timelineEditingHandle:
      typeof currentData.timelineEditingHandle === "string" ? currentData.timelineEditingHandle : "",
    scheduleSummaryExpanded: Boolean(currentData.scheduleSummaryExpanded),
    timelineDayRangeMenuOpen: Boolean(currentData.timelineDayRangeMenuOpen),
    planningScrollTop:
      typeof page._planningScrollTop === "number"
        ? page._planningScrollTop
        : typeof currentData.planningScrollTop === "number"
          ? currentData.planningScrollTop
          : runtime.state.home.planningView.initialScrollTopPx,
  });
  syncToastFromRuntime(page, runtime);
  syncSheetPresentationFromRuntime(page, runtime);
}

function syncSheetPresentationFromRuntime(page                    , runtime                                          ) {
  const currentData = page.data ?? {};
  const isVisible = Boolean(currentData.sheetVisible);
  const currentAnimationState = String(currentData.sheetAnimationState ?? "closed");

  if (runtime.state.sheetOpen) {
    if (isVisible && currentAnimationState === "open") {
      return;
    }

    clearSheetAnimationTimers(page);
    page.setData({
      sheetVisible: true,
      sheetAnimationState: "enter",
    });
    page._sheetAnimationFrameTimer = setTimeout(() => {
      page.setData({
        sheetAnimationState: "open",
      });
      page._sheetAnimationFrameTimer = null;
    }, 16);
    return;
  }

  if (!isVisible || currentAnimationState === "closing" || currentAnimationState === "closed") {
    return;
  }

  clearSheetAnimationTimers(page);
  page.setData({
    sheetAnimationState: "closing",
  });
  page._sheetAnimationTimer = setTimeout(() => {
    page.setData({
      sheetVisible: false,
      sheetAnimationState: "closed",
    });
    page._sheetAnimationTimer = null;
  }, 260);
}

function syncTimelineViewport(page                    , runtime                                          ) {
  page.setData({
    timelineScrollLeft: runtime.state.home.timelineView.initialScrollLeftPx,
    timelineHeaderOffsetPx: runtime.state.home.timelineView.initialScrollLeftPx,
    timelineScrollTop: runtime.state.home.timelineView.initialScrollTopPx,
  });
}

function syncPlanningViewport(
  page                    ,
  runtime                                          ,
  scrollTopPx = runtime.state.home.planningView.initialScrollTopPx,
) {
  const nextScrollTop = Math.max(0, scrollTopPx);
  page._planningScrollTop = nextScrollTop;
  page.setData({
    planningScrollTop: nextScrollTop,
  });
}

function extendPlanningWindowOnPage(
  page                    ,
  runtime                                          ,
  direction                             ,
) {
  if (page._planningWindowAdjusting) {
    return;
  }

  page._planningWindowAdjusting = true;
  const currentScrollTop =
    typeof page._planningScrollTop === "number"
      ? page._planningScrollTop
      : Number(page.data?.planningScrollTop ?? 0);
  const { addedSlotCount } = extendHomePlanningWindow(runtime.state.home, direction);
  const addedHeightPx = convertRpxToPx(addedSlotCount * runtime.state.home.planningView.slotHeightRpx);
  syncRuntimeToPage(page, runtime);
  syncPlanningViewport(
    page,
    runtime,
    direction === "before" ? currentScrollTop + addedHeightPx : currentScrollTop,
  );
  setTimeout(() => {
    page._planningWindowAdjusting = false;
  }, 0);
}

function clearTimelineLongPressTimer(page                    ) {
  if (page._timelineLongPressTimer) {
    clearTimeout(page._timelineLongPressTimer);
    page._timelineLongPressTimer = null;
  }
}

function convertPxToRpx(valuePx        ) {
  return Math.round((valuePx * 750) / resolveDeviceWidthPx());
}

function snapTimelineMinutes(value        ) {
  return Math.round(value / TIMELINE_EDIT_SNAP_MINUTES) * TIMELINE_EDIT_SNAP_MINUTES;
}

function clampTimelineMinutes(value        , min = 0, max = TIMELINE_DAY_MINUTES) {
  return Math.min(max, Math.max(min, value));
}

function toUtcIsoAtDateId(dateId        , minutes        ) {
  const [year, month, day] = dateId.split("-").map(Number);
  const safeMinutes = clampTimelineMinutes(minutes);
  const hours = Math.floor(safeMinutes / 60);
  const minute = safeMinutes % 60;
  return new Date(Date.UTC(year, month - 1, day, hours, minute, 0, 0)).toISOString();
}

function findTaskScheduleSegment(
  runtime                                          ,
  taskId        ,
  blockId        ,
) {
  const task = runtime.state.home.tasks.find((item) => item.id === taskId);
  const segment = task?.scheduleSegments.find((item) => item.id === blockId);
  return task && segment ? { task, segment } : null;
}

function setTimelineEditingState(
  page                    ,
  blockId               ,
  handle                                 = "",
) {
  page.setData({
    timelineEditingBlockId: blockId,
    timelineEditingHandle: handle,
  });
}

function findTimelineBlockPreviewLocation(page                    , blockId        ) {
  const days = page.data?.home?.timelineView?.days;
  if (!Array.isArray(days)) {
    return null;
  }

  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex];
    const blocks = Array.isArray(day?.blocks) ? day.blocks : [];
    const blockIndex = blocks.findIndex((block) => block?.scheduleBlockId === blockId);
    if (blockIndex >= 0) {
      return { dayIndex, blockIndex };
    }
  }

  return null;
}

function applyTimelineBlockPreviewPatch(
  page                    ,
  blockId        ,
  payload                                    ,
) {
  const location = findTimelineBlockPreviewLocation(page, blockId);
  if (!location) {
    return false;
  }

  const startMinutes = minutesSinceUtcMidnight(payload.startAt);
  const endMinutes = minutesSinceUtcMidnight(payload.endAt);
  const topRpx = startMinutes * TIMELINE_MINUTE_HEIGHT_RPX;
  const heightRpx = Math.max((endMinutes - startMinutes) * TIMELINE_MINUTE_HEIGHT_RPX, 72);
  const basePath = `home.timelineView.days[${location.dayIndex}].blocks[${location.blockIndex}]`;

  page.setData({
    [`${basePath}.startMinutes`]: startMinutes,
    [`${basePath}.endMinutes`]: endMinutes,
    [`${basePath}.startLabel`]: formatMinutesLabel(startMinutes),
    [`${basePath}.endLabel`]: formatMinutesLabel(endMinutes),
    [`${basePath}.topRpx`]: topRpx,
    [`${basePath}.heightRpx`]: heightRpx,
  });
  return true;
}

function beginTimelineEditGesture(
  page                    ,
  runtime                                          ,
  input   
                   
                    
                                      
                   
                                     
   ,
) {
  const resolved = findTaskScheduleSegment(runtime, input.taskId, input.blockId);
  if (!resolved) {
    return;
  }

  setTimelineEditingState(page, input.blockId, input.handle);
  page._timelineEditSession = {
    taskId: input.taskId,
    blockId: input.blockId,
    handle: input.handle,
    originTouchY: input.touchY,
    originStartAt: resolved.segment.startAt,
    originEndAt: resolved.segment.endAt,
    nextStartAt: resolved.segment.startAt,
    nextEndAt: resolved.segment.endAt,
    changed: false,
    startedFromExistingEdit: input.startedFromExistingEdit,
  };
}

function applyTimelineEditGesture(
  page                    ,
  runtime                                          ,
  touchY        ,
) {
  const session = page._timelineEditSession;
  if (!session) {
    return;
  }

  const dayId = toUtcDateId(session.originStartAt);
  const originStartMinutes = minutesSinceUtcMidnight(session.originStartAt);
  const originEndMinutes = minutesSinceUtcMidnight(session.originEndAt);
  const deltaMinutes = snapTimelineMinutes(convertPxToRpx(touchY - session.originTouchY) / TIMELINE_MINUTE_HEIGHT_RPX);
  const durationMinutes = Math.max(TIMELINE_EDIT_MIN_DURATION_MINUTES, originEndMinutes - originStartMinutes);

  let nextStartMinutes = originStartMinutes;
  let nextEndMinutes = originEndMinutes;

  if (session.handle === "body") {
    const proposedStart = clampTimelineMinutes(originStartMinutes + deltaMinutes, 0, TIMELINE_DAY_MINUTES - durationMinutes);
    nextStartMinutes = proposedStart;
    nextEndMinutes = proposedStart + durationMinutes;
  } else if (session.handle === "top") {
    nextStartMinutes = clampTimelineMinutes(
      originStartMinutes + deltaMinutes,
      0,
      originEndMinutes - TIMELINE_EDIT_MIN_DURATION_MINUTES,
    );
  } else {
    nextEndMinutes = clampTimelineMinutes(
      originEndMinutes + deltaMinutes,
      originStartMinutes + TIMELINE_EDIT_MIN_DURATION_MINUTES,
      TIMELINE_DAY_MINUTES,
    );
  }

  const nextStartAt = toUtcIsoAtDateId(dayId, nextStartMinutes);
  const nextEndAt = toUtcIsoAtDateId(dayId, nextEndMinutes);
  const clampedRange = clampTimelineBlockEditRange(
    runtime.state.home.tasks,
    session.taskId,
    session.blockId,
    session.handle,
    nextStartAt,
    nextEndAt,
  );
  const previewChanged =
    clampedRange.startAt !== session.nextStartAt || clampedRange.endAt !== session.nextEndAt;
  session.nextStartAt = clampedRange.startAt;
  session.nextEndAt = clampedRange.endAt;
  session.changed = clampedRange.startAt !== session.originStartAt || clampedRange.endAt !== session.originEndAt;
  if (!previewChanged) {
    return;
  }

  if (
    !applyTimelineBlockPreviewPatch(page, session.blockId, {
      startAt: clampedRange.startAt,
      endAt: clampedRange.endAt,
    })
  ) {
    runtime.previewTaskScheduleBlock(session.taskId, session.blockId, {
      startAt: clampedRange.startAt,
      endAt: clampedRange.endAt,
    });
    syncRuntimeToPage(page, runtime);
  }
}

async function finishTimelineEditGesture(
  page                    ,
  runtime                                          ,
) {
  clearTimelineLongPressTimer(page);
  const session = page._timelineEditSession;
  page._timelineEditSession = null;
  page._timelinePendingPress = null;

  if (!session) {
    return;
  }

  if (!session.changed) {
    if (session.startedFromExistingEdit) {
      setTimelineEditingState(page, null);
    } else {
      setTimelineEditingState(page, session.blockId, "body");
    }
    syncRuntimeToPage(page, runtime);
    return;
  }

  page._suppressTaskDetailTap = true;
  runtime.previewTaskScheduleBlock(session.taskId, session.blockId, {
    startAt: session.nextStartAt,
    endAt: session.nextEndAt,
  });
  await runPageAction(page, runtime, () =>
    runtime.updateTaskScheduleBlock(session.taskId, session.blockId, {
      startAt: session.nextStartAt,
      endAt: session.nextEndAt,
    }),
  );
  setTimelineEditingState(page, null);
}

async function runPageAction(
  page                    ,
  runtime                                          ,
  action                        ,
) {
  let pendingAction                  ;
  try {
    syncRuntimeToPage(page, runtime);
    pendingAction = Promise.resolve(action());
    syncRuntimeToPage(page, runtime);
    await pendingAction;
  } catch {
    // The runtime captures the user-facing error state; the page still needs a sync.
  } finally {
    syncRuntimeToPage(page, runtime);
  }
}

function registerHomePage() {
  const maybePage = globalThis                         
                                                      
   ;

  if (typeof maybePage.Page !== "function") {
    return;
  }

  const runtime = createHomePageRuntime();

  maybePage.Page({
    data: buildRegisteredPageData(runtime),
    _toastTimer: null,
    _lastToastKey: null,
    _sheetAnimationTimer: null,
    _sheetAnimationFrameTimer: null,
    _timelineLongPressTimer: null,
    _timelinePressStartY: 0,
    _timelinePendingPress: null,
    _timelineEditSession: null,
    _suppressTaskDetailTap: false,
    _planningScrollTop: runtime.state.home.planningView.initialScrollTopPx,
    _planningWindowAdjusting: false,
    _arrangeHandleTouchStartY: 0,
    _arrangeHandleDragging: false,
    onLoad() {
      syncRuntimeToPage(this, runtime);
      void runPageAction(this, runtime, () => runtime.loadTasks());
    },
    onReady() {
      syncRuntimeToPage(this, runtime);
      syncTimelineViewport(this, runtime);
      syncPlanningViewport(this, runtime);
      setTimeout(() => syncTimelineViewport(this, runtime), 0);
    },
    onShow() {
      syncRuntimeToPage(this, runtime);
      syncTimelineViewport(this, runtime);
      void runPageAction(this, runtime, async () => {
        await runtime.loadTasks();
        syncTimelineViewport(this, runtime);
      });
    },
    onTapTab(event                                                         ) {
      const tabId = event.currentTarget?.dataset?.tabId;
      if (!tabId) {
        return;
      }
      runtime.switchTab(tabId);
      syncRuntimeToPage(this, runtime);
      this.setData({
        timelineDayRangeMenuOpen: false,
      });
    },
    onToggleScheduleSummary() {
      this.setData({
        scheduleSummaryExpanded: !Boolean(this.data?.scheduleSummaryExpanded),
      });
    },
    onToggleTimelineDayRangeMenu() {
      this.setData({
        timelineDayRangeMenuOpen: !Boolean(this.data?.timelineDayRangeMenuOpen),
      });
    },
    onSelectTimelineDayRange(event                                                                  ) {
      const dayCount = Number(event.currentTarget?.dataset?.dayCount ?? 0);
      if (!Number.isFinite(dayCount)) {
        return;
      }

      this.setData({
        timelineDayRangeMenuOpen: false,
      });
      switchHomeTimelineVisibleDayCount(runtime.state.home, dayCount);
      syncRuntimeToPage(this, runtime);
      syncTimelineViewport(this, runtime);
    },
    onSwitchPlanningPeriod(event                                                                             ) {
      const planningPeriod = event.currentTarget?.dataset?.planningPeriod;
      if (!planningPeriod) {
        return;
      }
      switchHomePlanningPeriod(runtime.state.home, planningPeriod);
      this._planningScrollTop = runtime.state.home.planningView.initialScrollTopPx;
      syncRuntimeToPage(this, runtime);
      syncPlanningViewport(this, runtime);
    },
    onPlanningVerticalScroll(event                                     ) {
      this._planningScrollTop = Number(event.detail?.scrollTop ?? 0);
    },
    onPlanningVerticalScrollToUpper() {
      extendPlanningWindowOnPage(this, runtime, "before");
    },
    onPlanningVerticalScrollToLower() {
      extendPlanningWindowOnPage(this, runtime, "after");
    },
    async onOpenTaskDetail(event                                                       ) {
      if (this._suppressTaskDetailTap) {
        this._suppressTaskDetailTap = false;
        return;
      }

      if (typeof this.data?.timelineEditingBlockId === "string" && this.data.timelineEditingBlockId) {
        setTimelineEditingState(this, null);
        return;
      }

      const taskId = event.currentTarget?.dataset?.taskId;
      if (!taskId) {
        return;
      }

      await runPageAction(this, runtime, () => Promise.resolve(runtime.openTaskDetail(taskId)));
    },
    onTimelineBlockTouchStart(event                                                                                                                ) {
      const taskId = event.currentTarget?.dataset?.taskId;
      const blockId = event.currentTarget?.dataset?.blockId;
      if (!taskId || !blockId) {
        return;
      }

      const touchY = Number(event.touches?.[0]?.clientY ?? 0);
      const editingBlockId = typeof this.data?.timelineEditingBlockId === "string" ? this.data.timelineEditingBlockId : null;
      clearTimelineLongPressTimer(this);
      this._timelinePressStartY = touchY;
      this._timelinePendingPress = { taskId, blockId, touchY };

      if (editingBlockId === blockId) {
        this._suppressTaskDetailTap = true;
        beginTimelineEditGesture(this, runtime, {
          taskId,
          blockId,
          handle: "body",
          touchY,
          startedFromExistingEdit: true,
        });
        return;
      }

      this._timelineLongPressTimer = setTimeout(() => {
        this._suppressTaskDetailTap = true;
        beginTimelineEditGesture(this, runtime, {
          taskId,
          blockId,
          handle: "body",
          touchY,
          startedFromExistingEdit: false,
        });
        this._timelineLongPressTimer = null;
      }, TIMELINE_EDIT_LONG_PRESS_MS);
    },
    onTimelineBlockTouchMove(event                                           ) {
      const touchY = Number(event.touches?.[0]?.clientY ?? 0);
      if (this._timelineEditSession?.handle === "body") {
        applyTimelineEditGesture(this, runtime, touchY);
        return;
      }

      if (
        this._timelineLongPressTimer &&
        Math.abs(touchY - Number(this._timelinePressStartY ?? 0)) > 8
      ) {
        clearTimelineLongPressTimer(this);
        this._timelinePendingPress = null;
      }
    },
    async onTimelineBlockTouchEnd() {
      await finishTimelineEditGesture(this, runtime);
    },
    onTimelineBlockTouchCancel() {
      clearTimelineLongPressTimer(this);
      this._timelinePendingPress = null;
      this._timelineEditSession = null;
    },
    onTimelineResizeHandleTouchStart(event                                                                                                                                                 ) {
      const taskId = event.currentTarget?.dataset?.taskId;
      const blockId = event.currentTarget?.dataset?.blockId;
      const resizeHandle = event.currentTarget?.dataset?.resizeHandle;
      if (!taskId || !blockId || (resizeHandle !== "top" && resizeHandle !== "bottom")) {
        return;
      }

      clearTimelineLongPressTimer(this);
      this._suppressTaskDetailTap = true;
      beginTimelineEditGesture(this, runtime, {
        taskId,
        blockId,
        handle: resizeHandle,
        touchY: Number(event.touches?.[0]?.clientY ?? 0),
        startedFromExistingEdit: true,
      });
    },
    onTimelineResizeHandleTouchMove(event                                           ) {
      applyTimelineEditGesture(this, runtime, Number(event.touches?.[0]?.clientY ?? 0));
    },
    async onTimelineResizeHandleTouchEnd() {
      await finishTimelineEditGesture(this, runtime);
    },
    onTimelineResizeHandleTouchCancel() {
      clearTimelineLongPressTimer(this);
      this._timelineEditSession = null;
    },
    onCloseTaskDetail() {
      runtime.closeTaskDetail();
      syncRuntimeToPage(this, runtime);
    },
    async onOpenArrange() {
      await runPageAction(this, runtime, () => Promise.resolve(runtime.openArrangeSheet()));
    },
    onCloseArrange() {
      runtime.closeArrangeSheet();
      syncRuntimeToPage(this, runtime);
    },
    onArrangeHandleTouchStart(event                                           ) {
      this._arrangeHandleTouchStartY = Number(event.touches?.[0]?.clientY ?? 0);
      this._arrangeHandleDragging = true;
    },
    onArrangeHandleTouchMove(event                                           ) {
      if (!this._arrangeHandleDragging) {
        return;
      }

      const currentY = Number(event.touches?.[0]?.clientY ?? 0);
      if (currentY < this._arrangeHandleTouchStartY) {
        this._arrangeHandleTouchStartY = currentY;
      }
    },
    onArrangeHandleTouchEnd(event                                                  ) {
      if (!this._arrangeHandleDragging) {
        return;
      }

      const endY = Number(event.changedTouches?.[0]?.clientY ?? this._arrangeHandleTouchStartY);
      const dragDistance = endY - this._arrangeHandleTouchStartY;
      this._arrangeHandleDragging = false;
      if (dragDistance >= 48) {
        runtime.closeArrangeSheet();
        syncRuntimeToPage(this, runtime);
      }
    },
    onSwitchArrangeTab(event                                                                          ) {
      const arrangeTab = event.currentTarget?.dataset?.arrangeTab;
      if (!arrangeTab) {
        return;
      }
      runtime.switchArrangeTab(arrangeTab);
      syncRuntimeToPage(this, runtime);
    },
    async onStartNewArrangeConversation() {
      await runPageAction(this, runtime, () => runtime.startNewArrangeConversation());
    },
    async onOpenArrangeConversation(event                                                               ) {
      const conversationId = event.currentTarget?.dataset?.conversationId;
      if (!conversationId) {
        return;
      }
      await runPageAction(this, runtime, () => runtime.openArrangeConversation(conversationId));
    },
    onOpenAttachmentPicker() {
      runtime.openAttachmentPicker();
      syncRuntimeToPage(this, runtime);
    },
    onCloseAttachmentPicker() {
      runtime.closeAttachmentPicker();
      syncRuntimeToPage(this, runtime);
    },
    async onSelectAttachmentAction(event                                                                                 ) {
      const attachmentKind = event.currentTarget?.dataset?.attachmentKind;
      if (!attachmentKind) {
        return;
      }

      const attachment =
        attachmentKind === "doc"
          ? { name: "纤维瘤提取.docx", kind: "doc"         , fileName: "纤维瘤提取.docx" }
          : attachmentKind === "image"
            ? { name: "任务截图.png", kind: "image"         , fileName: "任务截图.png" }
            : { name: "粘贴文本", kind: "text"         , fileName: "粘贴文本" };

      await runPageAction(this, runtime, () => runtime.submitAttachment(attachment));
    },
    onDraftInput(event                                 ) {
      runtime.setDraftText(event.detail?.value ?? "");
      syncRuntimeToPage(this, runtime);
    },
    onAnswerInput(event                                 ) {
      runtime.setAnswerText(event.detail?.value ?? "");
      syncRuntimeToPage(this, runtime);
    },
    onRuntimeApiBaseUrlInput(event                                 ) {
      runtime.setRuntimeApiBaseUrlDraft(event.detail?.value ?? "");
      syncRuntimeToPage(this, runtime);
    },
    onSaveRuntimeApiBaseUrl() {
      runtime.saveRuntimeApiBaseUrl();
      syncRuntimeToPage(this, runtime);
    },
    onTimelineHorizontalScroll(event                                      ) {
      this.setData({
        timelineHeaderOffsetPx: Number(event.detail?.scrollLeft ?? 0),
      });
    },
    async onSubmitDraft() {
      await runPageAction(this, runtime, () => runtime.submitDraft());
    },
    async onSubmitClarification() {
      await runPageAction(this, runtime, () => runtime.submitClarification());
    },
    async onProposeSchedule() {
      await runPageAction(this, runtime, () => runtime.proposeSchedule());
    },
  });
}
