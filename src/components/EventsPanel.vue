<script setup lang="ts">
import { acquisition, type Entry, log } from '../tracking'

// properties shared by every event, already shown at the top of the panel
const COMMON = new Set(['event', 'timestamp', 'session_id', 'source', ...Object.keys(acquisition)])

function detail(entry: Entry): string {
  return Object.entries(entry)
    .filter(([key]) => !COMMON.has(key))
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ')
}
</script>

<template>
  <details class="events" open>
    <summary>Événements suivis ({{ log.length }})</summary>
    <p class="source">Source d'acquisition : <strong>{{ acquisition.source }}</strong></p>
    <ol>
      <li v-for="entry in log" :key="entry.timestamp + entry.event">
        <code>{{ entry.event }}</code>
        <span>{{ detail(entry) }}</span>
      </li>
    </ol>
  </details>
</template>

<style scoped>
.events {
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

summary {
  cursor: pointer;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.source {
  margin: 8px 0;
  color: var(--muted);
}

ol {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 220px;
  overflow-y: auto;
}

li {
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}

code {
  display: block;
  color: var(--accent);
}

span {
  font-size: 12px;
  color: var(--muted);
  word-break: break-word;
}
</style>
