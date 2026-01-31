const fs = require('fs').promises;
const path = require('path');


class NovelProcessor {
    constructor() {
        this.chapters = [];
        this.patternType = 'auto';
        // this.debugInfo = '';  // 调试信息已注释，如需调试请取消注释
        this.tocRules = [];
        this.rulesLoaded = false;
        this.outputFileName = '';
    }

    // ==================== 调试信息说明 ====================
    // 如需查看详细调试信息，请取消以下注释：
    // 1. 本文件第9行: this.debugInfo = '';
    // 2. 本文件所有 this.debugInfo += 的注释
    // 3. server.js 第57行: debug: processor.debugInfo
    // 4. server.js 第61行: debug: error.debugInfo || ''
    // 5. public/index.html 第405-407行: successMsg += '\n\n调试信息：\n' + data.debug;
    // 6. public/index.html 第412-414行: errorMsg += '\n\n' + data.debug;
    // ===================================================

    async loadTocRules() {
        try {
            const rulePath = path.join(__dirname, 'exportTxtTocRule.json');
            const ruleContent = await fs.readFile(rulePath, 'utf-8');
            const rules = JSON.parse(ruleContent);
            this.tocRules = rules.filter(r => r.enable === true);
            this.rulesLoaded = true;
            console.log(`成功加载 ${this.tocRules.length} 条章节识别规则`);
        } catch (error) {
            console.error('加载目录规则失败:', error.message);
            this.tocRules = [];
            this.rulesLoaded = false;
        }
    }

    setPattern(type) {
        this.patternType = type;
    }

    /**
     * 读取小说文件
     */
    /**
     * 读取小说文件，支持 encoding: 'utf-8' | 'gbk'
     */
    async readNovelFile(filePath, encoding = 'utf-8') {
        try {
            let content;
            switch (encoding) {
                case 'gbk': {
                    const iconv = require('iconv-lite');
                    const buffer = await fs.readFile(filePath);
                    content = iconv.decode(buffer, 'gbk');
                    console.log('以 gbk 编码读取');
                    break;
                }
                // case 'auto': {
                //     const jschardet = require('jschardet');
                //     const iconv = require('iconv-lite');
                //     const buffer = await fs.readFile(filePath);
                //     const detected = jschardet.detect(buffer);
                //     let enc = detected.encoding ? detected.encoding.toLowerCase() : 'utf-8';
                //     if (enc.includes('gb')) enc = 'gbk';
                //     if (enc !== 'utf-8' && enc !== 'gbk') enc = 'utf-8';
                //     content = iconv.decode(buffer, enc);
                //     console.log(`自动检测编码: ${enc}`);
                //     break;
                // }
                case 'utf-8':
                default: {
                    content = await fs.readFile(filePath, 'utf-8');
                    console.log('以 utf-8 编码读取');
                }
            }
            console.log(`成功读取文件: ${filePath}`);
            console.log(`文件长度: ${content.length} 字符`);
            return content;
        } catch (error) {
            throw new Error(`读取文件失败: ${error.message}`);
        }
    }

    /**
     * 按章节分割小说内容
     */
    splitIntoChapters(content, force = false) {
        let splitPatterns;

        if (this.tocRules.length === 0) {
            throw new Error('未加载到目录规则，请检查 exportTxtTocRule.json 文件');
        }

        if (this.patternType === 'auto') {
            splitPatterns = this.tocRules;
            // this.debugInfo = `使用自动识别模式，尝试 ${splitPatterns.length} 种规则...\n`;
        } else if (this.patternType === 'legacy') {
            const allPatterns = [
                { pattern: /^[ \t]*第(\d+)章[：:\s]*(.*)$/gm, type: 'zhnumcolon', name: '第n章：标题' },
                { pattern: /^[ \t]*第([零一二三四五六七八九十百千\d]+)章[　\s]*(.*)$/gm, type: 'zhfull', name: '第n章 标题' },
                { pattern: /^[ \t]*第([零一二三四五六七八九十百千\d]+)章[　\s]*$/gm, type: 'zh', name: '第n章' },
                { pattern: /^[ \t]*第([零一二三四五六七八九十百千\d]+)回[　\s]*(.*)$/gm, type: 'zhuihui', name: '第n回 标题' },
                { pattern: /^[ \t]*Chapter\s*(\d+)[\s\.:]*(.*)$/gim, type: 'en', name: 'Chapter n 标题' },
                { pattern: /^[ \t]*(\d+)[\.\:、　\s]+(.+)$/gm, type: 'dotnum', name: '数字. 标题' },
                { pattern: /^[ \t]*【第([零一二三四五六七八九十百千\d]+)章】[　\s]*(.*)$/gm, type: 'zhbracket', name: '【第n章】标题' },
                { pattern: /^[ \t]*【(\d+)】[　\s]*(.*)$/gm, type: 'numbracket', name: '【n】标题' },
                { pattern: /^[ \t]*(第[零一二三四五六七八九十百千\d]+\s*[卷篇部])[　\s]*(.*)$/gm, type: 'volume', name: '第n卷/篇/部 标题' }
            ];
            splitPatterns = allPatterns;
            // this.debugInfo = '使用旧版规则...\n';
        } else {
            const ruleIndex = parseInt(this.patternType);
            splitPatterns = this.tocRules.filter(r => r.serialNumber === ruleIndex);
            // this.debugInfo = `使用规则: ${splitPatterns[0]?.name || '未知'}\n`;
            // if (splitPatterns.length > 0) {
            //     this.debugInfo += `示例: ${splitPatterns[0].example}\n`;
            // }
        }

        let points = [];
        // let matchDetails = [];

        for (const rule of splitPatterns) {
            const pattern = new RegExp(rule.rule, 'gm');
            let m;
            let matchCount = 0;
            pattern.lastIndex = 0;
            while ((m = pattern.exec(content)) !== null) {
                points.push({
                    index: m.index,
                    match: m[0],
                    type: rule.serialNumber,
                    groups: m,
                    ruleName: rule.name
                });
                matchCount++;
                // if (matchCount <= 5) {
                //     matchDetails.push(`\n  规则"${rule.name}"匹配: "${m[0].substring(0, 50)}${m[0].length > 50 ? '...' : ''}"`);
                // }
            }
            if (matchCount > 0) {
                // this.debugInfo += `规则"${rule.name}"匹配到 ${matchCount} 处${matchCount > 5 ? '，显示前5处' : ''}：${matchDetails.slice(0, 5).join('')}\n`;
            }
        }

        if (this.patternType === 'auto') {
            // this.debugInfo += `\n总计匹配到 ${points.length} 处章节标记\n`;
        }

        if (points.length < 1) {
            let errorMsg = '未检测到章节标记，无法分割章节。\n\n';
            // errorMsg += '调试信息：\n';
            // errorMsg += this.debugInfo || '无调试信息';
            errorMsg += '\n建议：\n';
            errorMsg += '1. 检查章节标题是否在行首\n';
            errorMsg += '2. 尝试选择具体的章节格式\n';
            errorMsg += '3. 检查文件编码是否正确（UTF-8 或 GBK）\n';
            errorMsg += '4. 查看txt文件的章节格式，选择匹配的规则\n';
            if (this.tocRules.length === 0) {
                errorMsg += '5. 规则文件未加载，请检查 exportTxtTocRule.json\n';
            }
            const err = new Error('未检测到章节标记');
            err.debugInfo = errorMsg;
            throw err;
        }

        // this.debugInfo += `开始分割 ${points.length} 个章节...\n`;

        // 按 index 升序去重（同一位置只保留第一个）
        points = points.sort((a, b) => a.index - b.index).filter((p, i, arr) => i === 0 || p.index !== arr[i - 1].index);
        // this.debugInfo += `去重后剩余 ${points.length} 个章节\n`;
        // 切分章节
        let chapters = [];
        // 中文数字转阿拉伯数字
        function cn2num(str) {
            const cnNumMap = {零:0,一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,百:100,千:1000};
            if (/^\d+$/.test(str)) return parseInt(str, 10);
            let num = 0, temp = 0, lastUnit = 1;
            for (let c of str) {
                if (cnNumMap[c] >= 10) {
                    if (temp === 0) temp = 1;
                    num += temp * cnNumMap[c];
                    temp = 0;
                    lastUnit = cnNumMap[c];
                } else {
                    temp = temp * 10 + cnNumMap[c];
                }
            }
            num += temp;
            return num;
        }
        for (let i = 0; i < points.length; i++) {
            const start = points[i].index;
            const end = i < points.length - 1 ? points[i + 1].index : content.length;
            const rawTitle = points[i].match.trim();
            let title = rawTitle;
            let idx = i + 1;
            if (points[i].type === 'zhnumcolon') {
                title = points[i].groups[2].replace(/[　\s]+$/, '');
                idx = parseInt(points[i].groups[1], 10);
            } else if (points[i].type === 'zhfull') {
                title = points[i].groups[2].replace(/[　\s]+$/, '');
                idx = cn2num(points[i].groups[1]);
            } else if (points[i].type === 'zhuihui') {
                title = points[i].groups[2].replace(/[　\s]+$/, '');
                idx = cn2num(points[i].groups[1]);
            } else if (points[i].type === 'zhbracket') {
                title = points[i].groups[2].replace(/[　\s]+$/, '');
                idx = cn2num(points[i].groups[1]);
            } else if (points[i].type === 'zh') {
                idx = cn2num(points[i].groups[1]);
                title = '';
            } else if (points[i].type === 'numbracket') {
                title = points[i].groups[2].replace(/[　\s]+$/, '');
                idx = parseInt(points[i].groups[1], 10);
            } else if (points[i].type === 'dotnum') {
                let cnTitle = points[i].groups[2].split('（')[0].trim();
                title = cnTitle;
                idx = parseInt(points[i].groups[1], 10);
            } else if (points[i].type === 'en') {
                title = points[i].groups[2].replace(/[　\s]+$/, '');
                idx = parseInt(points[i].groups[1], 10);
            } else if (points[i].type === 'volume') {
                title = points[i].groups[2].replace(/[　\s]+$/, '');
                idx = cn2num(points[i].groups[1].replace(/[卷篇部]/, ''));
            }
            chapters.push({
                title,
                raw: rawTitle,
                content: content.substring(start + rawTitle.length, end).trim(),
                index: idx
            });
        }
        // 验证编号连续性（仅对有 index 的格式）
        let expected = chapters[0].index;
        let validChapters = [];
        for (let i = 0; i < chapters.length; i++) {
            if (!force) {
                if (typeof chapters[i].index === 'number' && chapters[i].index !== expected) {
                    console.error(`章节编号不连续，期望${expected}，实际${chapters[i].index}，已保留前${validChapters.length}章。`);
                    break;
                }
            }
            chapters[i].index = expected; // 强制重置为连续编号
            validChapters.push(chapters[i]);
            expected++;
        }
        if (validChapters.length === 0) {
            let errorMsg = '章节分割失败，未能保留任何有效章节。\n\n';
            // errorMsg += '调试信息：\n';
            // errorMsg += this.debugInfo;
            const err = new Error('章节分割失败');
            err.debugInfo = errorMsg;
            throw err;
        }
        chapters = validChapters;
        // this.debugInfo += `成功分割为 ${chapters.length} 个章节\n`;
        console.log(`成功分割为 ${chapters.length} 个章节`);
        return chapters;
    }



    /**
     * 主处理函数
     */
    async processNovel(filePath, originalFileName, encoding = 'utf-8', force = false, preview = false) {
        try {
            console.log('开始处理小说...');
            // 0. 确保规则已加载
            if (!this.rulesLoaded) {
                await this.loadTocRules();
            }
            if (this.tocRules.length === 0 && this.patternType !== 'legacy') {
                throw new Error('未加载到目录规则，请检查 exportTxtTocRule.json 文件');
            }
            // 1. 读取文件
            const content = await this.readNovelFile(filePath, encoding);
            // 2. 分割章节
            this.chapters = this.splitIntoChapters(content, force);
            // 随机抽一章显示原文：
            const randIdx = Math.floor(Math.random() * this.chapters.length);
            console.log(`随机章节示例: ${this.chapters[randIdx].title}, 原始标题: ${this.chapters[randIdx].raw}, 内容长度: ${this.chapters[randIdx].content.length} 字符`);
            // console.log(`章节原文: ${this.chapters[randIdx].content}`);

            // 3. 生成JSON格式
            // 从头文件读取 entries 头部，并记录最大uid
            let entries = {};
            let maxUid = 1;
            try {
                const headJson = await fs.readFile('./世界书_头.json', 'utf-8');
                const headObj = JSON.parse(headJson);
                if (headObj && headObj.entries) {
                    entries = { ...headObj.entries };
                    // 查找最大uid
                    for (const k of Object.keys(entries)) {
                        const v = entries[k];
                        if (typeof v.uid === 'number' && v.uid > maxUid) {
                            maxUid = v.uid;
                        }
                    }
                }
            } catch (e) {
                console.error('读取头文件失败，使用空头部。', e.message);
            }
            console.log(`头文件条目数: ${Object.keys(entries).length}，最大uid: ${maxUid}`);

            // 新章节编号和uid从maxUid+1递增
            for (let i = 0; i < this.chapters.length; i++) {
                const chapter = this.chapters[i];
                const entryIdx = maxUid + i + 1; // 保证编号连续（如头部最大uid为1，则新章节从2开始）
                entries[entryIdx] = {
                    uid: entryIdx,
                    key: [
                        `【${i + 1}】`
                    ],
                    keysecondary: [],
                    comment: chapter.raw,
                    content: `# ${chapter.title}\n${chapter.content}`,
                    constant: false,
                    vectorized: false,
                    selective: true,
                    selectiveLogic: 0,
                    addMemo: true,
                    order: 500 + i,
                    position: 4,
                    disable: false,
                    ignoreBudget: false,
                    excludeRecursion: false,
                    preventRecursion: false,
                    matchPersonaDescription: false,
                    matchCharacterDescription: false,
                    matchCharacterPersonality: false,
                    matchCharacterDepthPrompt: false,
                    matchScenario: false,
                    matchCreatorNotes: false,
                    delayUntilRecursion: false,
                    probability: 100,
                    useProbability: true,
                    depth: 0,
                    group: "",
                    groupOverride: false,
                    groupWeight: 100,
                    scanDepth: null,
                    caseSensitive: null,
                    matchWholeWords: null,
                    useGroupScoring: null,
                    automationId: "",
                    role: 2,
                    sticky: 0,
                    cooldown: 0,
                    delay: 0,
                    triggers: [],
                    displayIndex: entryIdx,
                    characterFilter: {
                        isExclude: false,
                        names: [],
                        tags: []
                    }
                };
                if (preview) {
                    entries[entryIdx].key.push(`【${i}】`);
                }
            }
            const output = { entries };
            // 生成输出文件名：原文件名_世界书.json（去掉.txt扩展名）
            const baseName = path.basename(originalFileName, path.extname(originalFileName));
            const outputFile = `${baseName}_世界书.json`;
            this.outputFileName = outputFile;
            await fs.writeFile(outputFile, JSON.stringify(output, null, 2), 'utf-8');
            console.log(`处理完成！结果已保存到: ${outputFile}`);
            return output;
        } catch (error) {
            console.error('处理小说时发生错误:', error);
            throw error;
        }
    }
}

// 使用示例
async function main() {
    // 解析命令行参数 node novelProcessor.js 文件名.txt -e=encoding -f=force -p=preview
    // encoding 可选 utf-8（默认）、gbk
    // force 可选 true、false（默认），表示是否无视小说文件不按顺序的章节编号
    // preview 可选，是否要下回预告功能（即绿灯激活当前原文和下一篇的原文）
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.error('请指定要处理的 txt 文件名，如: node novelProcessor.js 文件名.txt [-e=encoding] [-f=true] [-p=true]');
        process.exit(1);
    }
    const txtFile = args[0];
    // 解析可选参数
    const argObj = {};
    for (let i = 1; i < args.length; i++) {
        const m = args[i].match(/^-(\w)=(.+)$/);
        if (m) {
            argObj[m[1]] = m[2];
        }
    }
    const encoding = argObj['e'] || 'utf-8';
    const force = argObj['f'] === 'true' || argObj['f'] === '1';
    const preview = argObj['p'] === 'true' || argObj['p'] === '1';
    // 创建处理器实例
    const processor = new NovelProcessor();
    // 处理小说文件
    try {
        await processor.processNovel(txtFile, encoding, force, preview);
    } catch (error) {
        console.error('运行失败:', error.message);
    }
}

if (require.main === module) {
    main();
}

module.exports = NovelProcessor;

