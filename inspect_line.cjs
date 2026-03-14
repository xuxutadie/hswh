const fs = require('fs');
const content = fs.readFileSync('src/data/raw_p46.txt', 'utf-8');
const lines = content.split(/\r?\n/);

// Question 4 is around line 20
// Let's print lines 20-30 with char codes
for (let i = 20; i < 30; i++) {
    const line = lines[i];
    console.log(`Line ${i+1}: ${line}`);
    console.log(`Hex: ` + Buffer.from(line).toString('hex'));
}
