<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'

const { frontmatter } = useData()

// Validation in config.mts (transformPageData) already normalizes keywords
// to a string[]; this stays defensive for direct component usage.
const keywords = computed<string[]>(() => {
  const raw = frontmatter.value.keywords
  if (!raw) return []
  return Array.isArray(raw) ? raw : String(raw).split(',')
})

const dateText = computed(() => {
  const raw = frontmatter.value.date
  if (!raw) return ''
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? String(raw) : date.toISOString().slice(0, 10)
})
</script>

<template>
  <div v-if="frontmatter.title || keywords.length > 0" class="doc-header">
    <h1 v-if="frontmatter.title" class="doc-header-title">{{ frontmatter.title }}</h1>
    <p v-if="frontmatter.subtitle" class="doc-header-subtitle">{{ frontmatter.subtitle }}</p>
    <div class="doc-header-meta">
      <div class="meta-tags">
        <span v-for="kw in keywords" :key="kw" class="meta-item meta-tag icon-tag">{{ kw }}</span>
      </div>
      <div class="meta-info">
        <span v-if="frontmatter.author" class="meta-item icon-person">{{ frontmatter.author }}</span>
        <span v-if="dateText" class="meta-item icon-calendar">{{ dateText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Rendered into the "doc-before" slot (above .vp-doc), so typography is
   self-contained instead of relying on .vp-doc rules. */
.doc-header {
  margin-bottom: 24px;
}

.doc-header-title {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--vp-c-text-1);
}

.doc-header-subtitle {
  margin: 6px 0 0;
  font-size: 18px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.doc-header-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.meta-info {
  display: flex;
  align-items: center;
  gap: 16px;
  /* Right-aligns the group even when it wraps below the tags on
     narrow viewports (margin-left:auto keeps it pinned to the end). */
  margin-left: auto;
}

.meta-item {
  display: inline-flex;
  align-items: center;
}

.meta-item::before {
  content: '';
  width: 14px;
  height: 14px;
  margin-right: 5px;
  background-color: currentColor;
  -webkit-mask-image: var(--mi-icon);
  mask-image: var(--mi-icon);
  -webkit-mask-size: contain;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.icon-person {
  --mi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='currentColor' d='M8 8.5c3.85 0 7 2.5 7 4.5a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2c0-2 3.15-4.5 7-4.5M8 10c-1.61 0-3.064.526-4.092 1.234C2.798 12.001 2.5 12.733 2.5 13a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5c0-.267-.297-1-1.408-1.766C11.064 10.526 9.609 10 8 10m0-9a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7m0 1.5a2 2 0 1 0 0 4a2 2 0 0 0 0-4'%2F%3E%3C%2Fsvg%3E");
}

.icon-calendar {
  --mi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='currentColor' fill-rule='evenodd' d='M5.25 5.497a.75.75 0 0 1-.75-.75V4A1.5 1.5 0 0 0 3 5.5v1h10v-1A1.5 1.5 0 0 0 11.5 4v.75a.75.75 0 0 1-1.5 0V4H6v.747a.75.75 0 0 1-.75.75M10 2.5H6v-.752a.75.75 0 1 0-1.5 0V2.5a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3h7a3 3 0 0 0 3-3v-6a3 3 0 0 0-3-3v-.75a.75.75 0 0 0-1.5 0zM3 8v3.5A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5V8z' clip-rule='evenodd'/%3E%3C/svg%3E");
}

.icon-tag {
  --mi-icon: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='currentColor' fill-rule='evenodd' d='m13.06 8.818l-4.869 4.87a1 1 0 0 1-1.408.006l-4.45-4.37a1 1 0 0 1-.012-1.414l4.868-4.96a1.5 1.5 0 0 1 1.07-.45H12.5a1 1 0 0 1 1 1v4.257a1.5 1.5 0 0 1-.44 1.061m-6.942-6.92A3 3 0 0 1 8.259 1H12.5A2.5 2.5 0 0 1 15 3.5v4.257a3 3 0 0 1-.879 2.122l-4.87 4.87a2.5 2.5 0 0 1-3.519.015l-4.45-4.37a2.5 2.5 0 0 1-.032-3.535zM10.5 6.5a1.25 1.25 0 1 1 0-2.5a1.25 1.25 0 0 1 0 2.5' clip-rule='evenodd'/%3E%3C/svg%3E");
}

.meta-tag {
  padding: 2px 10px;
  border-radius: 999px;
  background-color: var(--vp-c-default-soft);
}
</style>
