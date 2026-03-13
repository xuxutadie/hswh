import fs from 'fs';

const allQuestions = JSON.parse(fs.readFileSync('src/data/parsed_questions.json', 'utf8'));

// Filter for Junior High questions
const juniorQuestions = allQuestions.filter(q => q.grade === 'junior_high');

console.log(`Total Junior High Questions: ${juniorQuestions.length}`);

// Split by type
const singleChoice = juniorQuestions.filter(q => q.type === 'single');
const multipleChoice = juniorQuestions.filter(q => q.type === 'multiple');

console.log(`Single Choice Count: ${singleChoice.length}`);
console.log(`Multiple Choice Count: ${multipleChoice.length}`);

// Verify sufficiency
if (singleChoice.length < 70) {
  console.error('ERROR: Not enough single choice questions (Need 70)!');
} else {
  console.log('PASS: Sufficient single choice questions available.');
}

if (multipleChoice.length < 30) {
  console.error('ERROR: Not enough multiple choice questions (Need 30)!');
} else {
  console.log('PASS: Sufficient multiple choice questions available.');
}

// Simulate one selection round
const shuffledSingle = [...singleChoice].sort(() => Math.random() - 0.5);
const shuffledMultiple = [...multipleChoice].sort(() => Math.random() - 0.5);

const selectedSingle = shuffledSingle.slice(0, 70);
const selectedMultiple = shuffledMultiple.slice(0, 30);

const finalSet = [...selectedSingle, ...selectedMultiple];

console.log('--- Simulation Result ---');
console.log(`Selected Single: ${selectedSingle.length}`);
console.log(`Selected Multiple: ${selectedMultiple.length}`);
console.log(`Total in Exam: ${finalSet.length}`);

// Verify random shuffling (simple check: first few IDs)
console.log('Sample IDs from selection:', finalSet.slice(0, 5).map(q => q.id));
