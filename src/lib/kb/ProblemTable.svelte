<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, intakeAgrees, PROBLEM_INFO, TICKETS_REPO } from '#lib/kb/problems';

  let { ticket }: { ticket: number } = $props();

  const split = $derived(groupByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const channels = (c: Record<string, number>) =>
    Object.entries(c)
      .sort((a, b) => b[1] - a[1])
      .map(([ch, n]) => `${ch} ×${n}`)
      .join(' · ');
  const link = (n: number) => `https://github.com/${TICKETS_REPO}/issues/${n}`;
</script>

<p class="sum">
  <strong>{split.merged.length}</strong> reports merged into #{ticket} ·
  <strong>{split.groups.length}</strong>
  {split.groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tenants</th><th>came in by</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each split.groups as g (g.problem)}
      <tr class:unplaced={g.problem === 'unplaced'}>
        <td><code>{g.problem}</code></td>
        <td><strong>{g.reports.length}</strong></td>
        <td>{g.tenants}</td>
        <td class="muted">{channels(g.channels)}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td>
          {#if g.problem !== 'unplaced'}
            <a href={link(PROBLEM_INFO[g.problem].ticket)}>{TICKETS_REPO}#{PROBLEM_INFO[g.problem].ticket}</a>
          {:else}
            none yet
          {/if}
        </td>
      </tr>
    {/each}
  </tbody>
</table>

{#if split.alsoFiled}
  <p class="muted">Counted the desk's way: the {split.alsoFiled} <code>timezone</code> reports are also counted under the cause their tenant files them under.</p>
{/if}

<dl>
  {#each split.groups as g (g.problem)}
    {#if g.problem !== 'unplaced'}
      <dt><code>{g.problem}</code> · {g.reports.length} reports</dt>
      <dd>
        {PROBLEM_INFO[g.problem].what}
        <span class="fix">Fix: {PROBLEM_INFO[g.problem].fix}</span>
        <span class="muted">Intake tagged {intakeAgrees(g)} of them <code>{g.problem}</code>.</span>
      </dd>
    {/if}
  {/each}
</dl>

<style>
  .sum { font-size: 1.1rem; }
  .muted { color: var(--muted); font-size: 0.85em; }
  .unplaced td { background: var(--warn-bg); color: var(--warn); }
  dt { font-weight: 600; margin-top: 0.75rem; }
  dd { margin: 0.2rem 0 0 0; }
  dd span { display: block; }
  .fix { margin-top: 0.2rem; }
</style>
