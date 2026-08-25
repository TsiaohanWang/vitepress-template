<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import ActivityCalendar from './ActivityCalendar.vue'

/**
 * 内容页底部的自动挂载点（经主题的 doc-footer-before 插槽渲染）：
 *
 * - 全站开关：themeConfig.autoPageActivityCalendar（缺省开启，
 *   在 config.mts 中配置，类型扩展见 theme/index.ts）；
 * - home 布局永不自动挂载——首页由 Markdown 显式调用 <ActivityCalendar />；
 * - 单页豁免：frontmatter 写 activityCalendar: false；
 *
 * 展示 page 粒度数据（仅触及当前 Markdown 文件的提交）。可见性只依赖
 * frontmatter 与站点配置，SSR 与水合结果一致。
 */
const { frontmatter, theme } = useData()

const visible = computed(
  () =>
    theme.value.autoPageActivityCalendar !== false &&
    frontmatter.value.layout !== 'home' &&
    frontmatter.value.activityCalendar !== false,
)
</script>

<template>
  <div v-if="visible" class="auto-activity-calendar">
    <ActivityCalendar scope="page" />
  </div>
</template>

<style scoped>
/* 卡片底部与页脚分割线（.prev-next 的 border-top）之间留出与全站节奏
   一致的呼吸空间：默认主题在分隔线下方给 24px 再接上一页/下一页按钮，
   上方同样用 24px 对称呼应；ActivityCalendar 根元素自带 margin-top。 */
.auto-activity-calendar {
  margin-bottom: 24px;
}
</style>
