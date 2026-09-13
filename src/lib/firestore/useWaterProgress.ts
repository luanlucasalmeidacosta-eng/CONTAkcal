import { useEffect, useMemo, useState } from "react";
import { getProtocolWeekInfo, type ProtocolWeekInfo } from "@/lib/nutrition/week";
import { subscribeWeekWaterLogs, sumWater, type WaterLogWithId } from "./water";

export interface WaterProgress {
  weekInfo: ProtocolWeekInfo;
  logsByDay: Map<number, WaterLogWithId[]>;
  todayTotalMl: number;
}

function dayIndexFor(date: Date, weekStart: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((date.setHours(0, 0, 0, 0) - weekStart.getTime()) / msPerDay);
  return Math.min(Math.max(diff + 1, 1), 7);
}

export function useWaterProgress(uid: string | undefined, protocolStartedAt: string | undefined): WaterProgress {
  const [logs, setLogs] = useState<WaterLogWithId[]>([]);
  const weekInfo = useMemo(
    () => getProtocolWeekInfo(protocolStartedAt ?? new Date().toISOString()),
    [protocolStartedAt],
  );

  useEffect(() => {
    if (!uid || !protocolStartedAt) {
      setLogs([]);
      return;
    }
    return subscribeWeekWaterLogs(uid, weekInfo.weekStart, setLogs);
  }, [uid, protocolStartedAt, weekInfo.weekStart]);

  return useMemo(() => {
    const logsByDay = new Map<number, WaterLogWithId[]>();
    const todayLogs: WaterLogWithId[] = [];

    for (const log of logs) {
      const createdAt = (log.createdAt as { toDate?: () => Date })?.toDate?.() ?? new Date();
      const dayIndex = dayIndexFor(new Date(createdAt), weekInfo.weekStart);
      const bucket = logsByDay.get(dayIndex) ?? [];
      bucket.push(log);
      logsByDay.set(dayIndex, bucket);
      if (dayIndex === weekInfo.dayIndexInWeek) todayLogs.push(log);
    }

    return { weekInfo, logsByDay, todayTotalMl: sumWater(todayLogs) };
  }, [logs, weekInfo]);
}
