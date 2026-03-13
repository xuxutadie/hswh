const fs = require('fs');
const files = ['src/data/raw_p13.txt', 'src/data/raw_p46.txt', 'src/data/raw_jh.txt', 'src/data/raw_jh_2.txt'];
files.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const count = (content.match(/答案：/g) || []).length;
        console.log(`${file}: ${count} questions`);
    }
});
