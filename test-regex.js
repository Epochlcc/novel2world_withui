const fs = require('fs');

const rules = JSON.parse(fs.readFileSync('./exportTxtTocRule.json', 'utf-8')).filter(r => r.enable && r.rule);

const testTitles = [
    "第一章 假装第一章前面有空白但我不要",
    "第一章 标准的粤语就是这样",
    "1、这个就是标题",
    "一、只有前面的数字有差别",
    "正文 我奶常山赵子龙",
    "Chapter 1 MyGrandmaIsNB",
    "【第一章 后面的符号可以没有",
    "☆、晋江作者最喜欢的格式",
    "卷五 开源盛世",
    "标题后面数字有括号(12)",
    "标题后面数字没有括号124",
    "分节阅读 第一页",
    "第129章：侠客与拳师",
    "第130章 隐形的根据地",
    "第一回 章节名",
    "序章 开篇",
    "后记 结束语",
    "番外 番外故事",
    "楔子 故事背景",
    "终章 最终章",
    "尾声 故事结束",
    "简介 老夫诸葛村夫"
];

console.log('='.repeat(80));
console.log('章节标题正则表达式测试');
console.log('='.repeat(80));
console.log(`共加载 ${rules.length} 条规则\n`);

rules.forEach(ruleData => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`规则名称: ${ruleData.name}`);
    console.log(`规则ID: ${ruleData.id}`);
    console.log(`示例: ${ruleData.example}`);
    console.log(`${'='.repeat(80)}\n`);

    let matchCount = 0;
    const matches = [];

    try {
        const pattern = new RegExp(ruleData.rule, 'gm');
        
        testTitles.forEach(title => {
            const match = title.match(pattern);
            if (match) {
                matchCount++;
                matches.push(title);
            }
        });

        if (matchCount > 0) {
            console.log(`✓ 匹配成功: ${matchCount}/${testTitles.length} 个标题`);
            matches.forEach((match, i) => {
                console.log(`  ${i + 1}. ${match}`);
            });
        } else {
            console.log(`✗ 匹配失败: 0/${testTitles.length} 个标题`);
        }
    } catch (error) {
        console.log(`✗ 正则表达式错误: ${error.message}`);
    }
});

console.log(`\n${'='.repeat(80)}`);
console.log('测试完成');
console.log('='.repeat(80));
