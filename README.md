
# 小说/剧集转 SillyTavern 世界书工具

## 项目简介

本项目可将小说、动画、漫画、短剧、连续剧等带有分段剧情的文本资源，自动切分为章节，并转化为 SillyTavern 世界书（World Book）格式 JSON，便于导入和二次开发。

### 支持特性
- 智能识别多种章节格式：
	- 中文章节（如“第一章 山边小村”）
	- 英文章节（如“Chapter 1 The Beginning”）
	- 数字. 标题（如“1. 集数标题”）
	- 兼容中文数字/阿拉伯数字编号
- 自动提取章节名、原始标题、编号
- 检查章节编号连续性，可选强制忽略
- 支持“下回预告”功能（可选）
- 输出标准 JSON，可直接导入 SillyTavern

## 快速开始

### 安装依赖

```bash
npm install
```
如需自动编码识别：
```bash
npm install jschardet
```

### 命令行用法

```bash
node novelProcessor.js 文件名.txt [-e=encoding] [-f=true] [-p=true]
```

- `文件名.txt`：待处理的文本文件
- `-e=encoding`：可选，文件编码，支持 `utf-8`（默认）、`gbk`
- `-f=true`：可选，强制忽略章节编号不连续（默认 false）
- `-p=true`：可选，启用“下回预告”功能（默认 false）

**示例：**
```bash
node novelProcessor.js 凡人.txt -e=gbk
node novelProcessor.js 火影忍者动画集数.txt -e=utf-8 -f=true
```

> `htmlProcessor.js` 为示例爬虫脚本，可用于爬取火影中文 wiki 剧集信息。请根据实际需求自行改写。

### 输出说明
- 生成的 JSON 文件名为 `世界书.json`（可自定义）
- 可直接导入 SillyTavern 世界书

## 注意事项
- 如章节格式特殊或未被识别，请调整正则表达式
- 大型 txt 文件建议先备份
- **头部 JSON 模板请根据实际需求自定义**，或在 SillyTavern 内添加

---

如有问题或建议，欢迎反馈！