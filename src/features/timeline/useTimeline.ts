import { useEffect, useMemo, useState } from "react";
import { timelineService, type TimelineEvent } from "../../services/agents";
import { gitService } from "../../services/git";
import { useEventLog, type OrbitrEvent } from "./eventLog";
import { isTauri } from "../../lib/platform";
import type { AgentSession } from "../../types";

export type Entry =
  | { source: "agent"; at: number; e: TimelineEvent }
  | { source: "orbitr"; at: number; e: OrbitrEvent }
  | { source: "git"; at: number; e: { short: string; subject: string } };

const EMPTY: OrbitrEvent[] = [];

/** Merged, time-ordered events for an agent: transcript + Orbitr's own log + commits in its folder. */
export function useTimeline(agent: AgentSession, cwd: string | undefined) {
  const orbitr = useEventLog((s) => s.byId[agent.id] ?? EMPTY);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [commits, setCommits] = useState<{ short: string; subject: string; time: number }[]>([]);

  useEffect(() => {
    if (!isTauri || !cwd) return;
    let alive = true;
    const load = () => {
      if (agent.chatId) void timelineService.events(cwd, agent.chatId).then((e) => alive && setEvents(e)).catch(() => undefined);
      void gitService.log(cwd, 30).then((c) => alive && setCommits(c.filter((x) => x.time >= agent.startedAt - 60_000))).catch(() => undefined);
    };
    load();
    const t = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [cwd, agent.chatId, agent.startedAt]);

  return useMemo(() => {
    const all: Entry[] = [
      ...events.map((e) => ({ source: "agent" as const, at: Date.parse(e.at), e })),
      ...orbitr.map((e) => ({ source: "orbitr" as const, at: Date.parse(e.at), e })),
      ...commits.map((c) => ({ source: "git" as const, at: c.time, e: c })),
    ];
    return all.filter((x) => !Number.isNaN(x.at)).sort((a, b) => a.at - b.at);
  }, [events, orbitr, commits]);
}
