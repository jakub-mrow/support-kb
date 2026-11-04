// The problems #4471 really holds, counted the way the desk counts (CauseTable): every report under
// the cause its tenant files it under (causes.ts), and the reports the desk read as a one-day move
// (desk-notes.json) counted again as their own problem, the way CauseTable footnotes them.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = 'parser' | 'hint' | 'timezone';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'timezone'];

export const TICKETS_REPO = 'jakub-mrow/support-kb';

// One ticket per problem, filed in TICKETS_REPO.
export const PROBLEM_INFO: Record<Problem, { ticket: number; what: string; fix: string }> = {
  parser: {
    ticket: 1,
    what: 'The shared parser reads every date month first. Day-first tenants get day and month swapped.',
    fix: 'Parse with the tenant locale. This is the fix #4471 has queued.',
  },
  hint: {
    ticket: 2,
    what: 'booking-v3 prints MM/DD/YYYY under its date field. Day-first tenants type month first as told, and the form reads it day first.',
    fix: 'Print the hint in the tenant locale. The parser fix alone does not close these.',
  },
  timezone: {
    ticket: 3,
    what: 'The booked date moves by one day, or differs between attendees in different time zones. No day/month swap explains it. The desk still files these under parser by tenant.',
    fix: 'Build the invite date in the tenant time zone, not the server one. Neither date fix above touches it.',
  },
};

// The cause a report is filed under, by tenant. One-day moves stay filed here too.
export function filedAs(r: Pick<Report, 'channel'>, t: Tenant | undefined): Problem | null {
  return causeOf(r, t);
}

export type ProblemGroup = {
  problem: Problem | 'unplaced';
  reports: Report[];
  tenants: number;
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

function group(problem: ProblemGroup['problem'], rs: Report[]): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    tenants: new Set(rs.map((r) => r.tenant)).size,
    channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

export function groupByProblem(
  reports: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { merged: Report[]; groups: ProblemGroup[]; alsoFiled: number } {
  const merged = uniqueById(reports).filter((r) => r.mergedInto === ticket);
  const byProblem = new Map<ProblemGroup['problem'], Report[]>();
  for (const r of merged) {
    const p = filedAs(r, tenantOf(r)) ?? 'unplaced';
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  const moved = merged.filter((r) => oneDayMove.includes(r.id));
  if (moved.length) byProblem.set('timezone', moved);
  const order = (p: ProblemGroup['problem']) => (p === 'unplaced' ? PROBLEMS.length : PROBLEMS.indexOf(p));
  const groups = [...byProblem.entries()].map(([p, rs]) => group(p, rs)).sort((a, b) => order(a.problem) - order(b.problem));
  // One-day moves are also counted under the cause they are filed under.
  const alsoFiled = moved.filter((r) => filedAs(r, tenantOf(r)) !== null).length;
  return { merged, groups, alsoFiled };
}

// Intake's browser guess (`meta.intakeTag`) against the problem the tenant says it is.
export function intakeAgrees(g: ProblemGroup): number {
  return g.reports.filter((r) => r.meta.intakeTag === g.problem).length;
}
