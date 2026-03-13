const fs = require('fs');
const filePath = 'src/data/raw_p46.txt';
let content = fs.readFileSync(filePath, 'utf8');

// Fix: 答案：BA. -> 答案：B\nA.
// Regex: /答案：([A-D])([A-D]\.)/g
// Replacement: 答案：$1\n$2

let fixedCount = 0;
content = content.replace(/答案：([A-D])([A-D]\.)/g, (match, p1, p2) => {
    fixedCount++;
    return `答案：${p1}\n${p2}`;
});

console.log(`Fixed ${fixedCount} issues.`);
fs.writeFileSync(filePath, content);
