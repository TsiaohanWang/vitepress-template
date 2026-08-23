---
title: 常见问题与排查
subtitle: 构建失败与内容异常的统一排错手册
keywords:
  - 排错
  - 构建
  - VitePress
---

本页汇总模板全部已知的构建失败模式与内容异常的定位方法。此前分散在各个增强章节的排错内容均已合并至此。

## 构建期硬错误（中断构建）

### frontmatter 缺失必填字段

非 `layout: home` 页面缺少 `title` 或 `keywords` 时，构建直接失败，错误形如：

```
[frontmatter] guide/foo.md: "title" is required
```

**解决**：按 [文章元数据](/guide/enhancements#文章元数据) 补全 frontmatter；`keywords` 支持数组或逗号分隔字符串两种写法。校验逻辑位于 `config.mts` 的 `transformPageData`，归一化实现见 `.vitepress/frontmatter.ts`。

### 内部死链接

内部链接指向不存在的页面时构建失败（dead link 检查默认开启）。

**解决**：修正链接目标。确需临时跳过可设置 `ignoreDeadLinks`（不推荐长期保留，会掩盖真实断链）。

### YAML 解析失败

frontmatter 值包含未引号冒号（如 `title: A: B`）会抛 `YAMLException`。

**解决**：为含特殊字符的值加引号：`title: "A: B"`。

### 未闭合的尖括号标签

正文中形似 HTML 标签的内容（`List<string>`、`<tag>`）会被当作 Vue 模板解析，报 `Element is missing end tag`。

**解决**：用反引号包裹为行内代码 `` `List<string>` ``，或写作实体 `&lt;string&gt;`。

## 图标问题（警告，不中断构建）

图标语法有误时，构建日志打印 `[iconify]` 警告并**丢弃该图标**（页面其余内容正常输出）：

| 警告 | 原因 |
|---|---|
| `malformed icon syntax, expected "set:name"` | 语法不完整或前缀缺失 |
| `unknown icon set or malformed name` | 图标集未在 `iconify.ts` 注册，或前缀写错 |
| `icon not found in "..."` | 图标名在该集中不存在 |
| `invalid size/color modifier` | 修饰符值未通过白名单校验（被忽略，图标本体仍渲染） |

常见陷阱：修饰符必须用空格与名称隔开，`::set:name=24::` 这类粘连写法会把 `name=24` 整体当作图标名去查找而失败。

需要让坏图标在 CI 中直接中断构建：设环境变量 `ICONIFY_STRICT=1` 再执行构建（本仓库 CI 已默认开启）。语法详见 [Iconify 图标](/guide/enhancements#iconify-图标)。

## Typst 问题

- **编译失败不中断构建**：终端打印诊断，页面原位展示红色占位块；修复源码后重新构建即可
- **结果疑似过期/想强制重编译**：删除缓存目录 `.vitepress/cache/typst-svg/`（按源码哈希存储，正常情况无需手动管理）
- **`@preview/*` 包下载失败**：包首次使用时从官方仓库下载至 `~/.cache/typst/packages`，离线环境需预先缓存或允许网络访问
- **输出整张 A4 而非贴合图形**：源码中务必设置 `#set page(width: auto, height: auto, margin: ...)`
- **想展示 typst 源码原文**：使用 4 个及以上反引号的围栏（恰好 3 个反引号才会被编译渲染）

完整用法见 [Typst 图表](/guide/typst)，渲染示例见 [Typst 图表示例](/examples/typst-diagrams)。

## 特殊字符速查表

| 写法 | 行为 | 解决方案 |
|---|---|---|
| 正文 `{{ x }}`、`{{ a b c }}` | ✅ 已内置防护：自动转义为字面量显示 | 无需处理；真实 Vue 插值请用原生 HTML/SFC 块 |
| frontmatter 值含未引号冒号 | ❌ YAMLException | 为值加引号 |
| 内部链接指向不存在的页面 | ❌ dead link 错误 | 修正链接；确需跳过时设置 `ignoreDeadLinks` |
| 正文裸尖括号标签 | ❌ Element is missing end tag | 反引号包裹或写作 HTML 实体 |
| 西文单引号 `'`（含 frontmatter） | ✅ 正常 | 仅当值以引号开头且内部再有引号时需转义 |

花括号防护的实现细节见 [花括号安全防护](/guide/enhancements#花括号安全防护)。

## 本地搜索无结果

搜索分词器已内置 CJK 支持（Intl.Segmenter，见[本地搜索](/guide/enhancements#本地搜索)）。若仍无结果：

- 确认关键词出现在被索引字段（标题、正文）而非 frontmatter 元数据
- 开发模式下修改配置后重启 dev server，让搜索索引随缓存一起重建

## 预览服务器返回 404 / 无样式

`docs:preview` 的静态服务器在启动时缓存 `dist` 文件清单。每次重新 `docs:build` 后需**重启 preview**，否则新哈希的 CSS/JS 会 404（表现为「有内容但无样式」）。生产部署到静态托管不受影响。
