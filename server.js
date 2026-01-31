const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const NovelProcessor = require('./novelProcessor');
const iconv = require('iconv-lite');

// ==================== 调试信息说明 ====================
// 默认情况下，调试信息已注释，只显示简单的成功/失败消息
// 如需查看详细调试信息（规则匹配情况等），请：
// 1. 取消 novelProcessor.js 第9行注释: this.debugInfo = '';
// 2. 取消 novelProcessor.js 所有 this.debugInfo += 的注释
// 3. 取消 server.js 第57行注释: debug: processor.debugInfo
// 4. 取消 server.js 第61行注释: debug: error.debugInfo || ''
// 5. 取消 public/index.html 第405-407行注释: successMsg += '\n\n调试信息：\n' + data.debug;
// 6. 取消 public/index.html 第412-414行注释: errorMsg += '\n\n' + data.debug;
// ===================================================

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        try {
            const decodedName = iconv.decode(Buffer.from(file.originalname, 'binary'), 'utf-8');
            cb(null, `${timestamp}-${decodedName}`);
        } catch (e) {
            cb(null, `${timestamp}-${file.originalname}`);
        }
    }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/api/rules', async (req, res) => {
    try {
        const processor = new NovelProcessor();
        await processor.loadTocRules();
        res.json({
            rules: processor.tocRules
        });
    } catch (error) {
        console.error('获取规则失败:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/convert', upload.single('file'), async (req, res) => {
    try {
        const encoding = req.body.encoding || 'utf-8';
        const pattern = req.body.pattern || 'auto';
        const force = req.body.force === 'true';
        const preview = req.body.preview === 'true';

        if (!req.file) {
            return res.status(400).json({ error: '请上传文件' });
        }

        let originalName = req.file.originalname;
        try {
            const decodedName = iconv.decode(Buffer.from(req.file.originalname, 'binary'), 'utf-8');
            originalName = decodedName;
        } catch (e) {
            console.log('文件名解码失败，使用原始文件名');
        }

        const processor = new NovelProcessor();
        processor.setPattern(pattern);
        const result = await processor.processNovel(req.file.path, originalName, encoding, force, preview);

        res.json({
            success: true,
            chapters: processor.chapters.length,
            message: '转换成功',
            outputFileName: processor.outputFileName
            // debug: processor.debugInfo
        });
    } catch (error) {
        console.error('转换失败:', error);
        res.status(500).json({ error: error.message });
        // debug: error.debugInfo || ''
    }
});

app.get('/api/download', async (req, res) => {
    try {
        const fileName = req.query.file || '世界书.json';
        const customName = req.query.customName || fileName;
        const filePath = path.join(__dirname, fileName);
        await fs.access(filePath);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(customName)}`);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.sendFile(filePath);
    } catch (error) {
        res.status(404).json({ error: '文件不存在' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const init = async () => {
    try {
        await fs.mkdir('uploads', { recursive: true });
        await fs.mkdir('public', { recursive: true });
        app.listen(PORT, () => {
            console.log(`服务器运行在 http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('初始化失败:', error);
    }
};

init();
