const fs = require('fs');

function fixFile(filename) {
    if (!fs.existsSync(filename)) {
        console.log(`File not found: ${filename}`);
        return;
    }
    let content = fs.readFileSync(filename, 'utf-8');
    
    // 1. Fix merged options: ChineseChar + [Space] + A-D.
    // e.g. "享受C." -> "享受\nC."
    const originalLength = content.length;
    content = content.replace(/([\u4e00-\u9fa5])\s*([A-D]\.)/g, '$1\n$2');
    
    // 2. Fix merged questions: ChineseChar + [Space] + Number.
    // e.g. "服务26." -> "服务\n26."
    content = content.replace(/([\u4e00-\u9fa5])\s*(\d+\.)/g, '$1\n$2');

    // 3. Fix merged "Answer:"
    // e.g. "D. Option 答案：A" -> "D. Option\n答案：A"
    // Also "D. Option答案：A"
    content = content.replace(/([^\n])\s*(答案：)/g, '$1\n$2');

    if (content.length !== originalLength) {
        fs.writeFileSync(filename, content, 'utf-8');
        console.log(`Fixed merged content in ${filename}`);
    } else {
        console.log(`No changes needed for ${filename}`);
    }
}

fixFile('src/data/raw_p46.txt');
fixFile('src/data/raw_jh.txt');
