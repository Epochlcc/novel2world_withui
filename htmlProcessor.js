const fs = require('fs');
const cheerio = require('cheerio');

function extractEpisodes(htmlPath, outputPath, startIndex = 1, append = false) {
    const html = fs.readFileSync(htmlPath, 'utf-8');
    const $ = cheerio.load(html);

    let result = '';
    let episodeIndex = startIndex;
    // 只查找主表格（有tbody）
    $('table').each((tableIdx, table) => {
        let rows = $(table).find('tr');
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            // 主行：有th（集数）、td.summary（标题）
            const th = $(row).find('th[scope="row"]');
            const titleTd = $(row).find('td.summary');
            if (th.length && titleTd.length) {
                const epNum = th.text().trim();
                // 标题可能带有多余换行和括号，取第一个换行前内容
                let title = titleTd.text().trim().split('\n')[0];
                // 下一行为内容行（expand-child）
                let content = '';
                if (i + 1 < rows.length) {
                    const nextRow = rows[i + 1];
                    const descTd = $(nextRow).find('td.description');
                    if (descTd.length) {
                        content = descTd.text().replace(/\n+/g, '\n').trim();
                    }
                }
                if (epNum && title && content) {
                    result += `${episodeIndex}. ${title}\n${content}\n\n`;
                    episodeIndex++;
                }
            }
        }
    });

    if (!result) {
        console.log('未能提取到任何集数信息，请检查HTML结构。');
    } else {
        if (append) {
            fs.appendFileSync(outputPath, result, 'utf-8');
            console.log(`已追加到 ${outputPath}`);
        } else {
            fs.writeFileSync(outputPath, result, 'utf-8');
            console.log(`已保存到 ${outputPath}`);
        }
    }
}

// 用法示例：
// 第一部
// extractEpisodes(
//     './火影忍者动画集数列表 - 维基百科，自由的百科全书.html',
//     './火影忍者动画集数.txt',
//     1,
//     false
// );
// 第二部（疾风传，221集起）
// extractEpisodes(
//     './火影忍者疾风传动画集数列表 (前期) - 维基百科，自由的百科全书.html',
//     './火影忍者动画集数.txt',
//     221,
//     true
// );

// 第三部（疾风传后续，513集起）
extractEpisodes(
    './火影忍者疾风传动画集数列表 (后期) - 维基百科，自由的百科全书.html',
    './火影忍者动画集数.txt',
    513,
    true
);
