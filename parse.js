import fs from 'fs';

const parseFile = (filename, grade) => {
  if (!fs.existsSync(filename)) return [];
  let content = fs.readFileSync(filename, 'utf-8');
  
  // Pre-process content to fix merges (Robustness layer)
  // 1. Fix merged options: ChineseChar + [Space] + A-D. e.g. "享受C." -> "享受\nC."
  content = content.replace(/([\u4e00-\u9fa5])\s*([A-D]\.)/g, '$1\n$2');
  // 2. Fix merged questions: ChineseChar + [Space] + Number. e.g. "服务26." -> "服务\n26."
  content = content.replace(/([\u4e00-\u9fa5])\s*(\d+\.)/g, '$1\n$2');
  // 3. Fix merged "Answer:" e.g. "D. Option 答案：A" -> "D. Option\n答案：A"
  content = content.replace(/([^\n])\s*(答案：)/g, '$1\n$2');

  // Use a more robust split that handles different newline types and keeps empty lines if they are within a question
  const lines = content.split(/\r?\n/).map(l => l.trim());
  
  const questions = [];
  let currentQuestion = null;
  let idCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Check for a line containing "答案：" - this is our primary anchor
    const ansMatch = line.match(/^(.*?)\s*答案：\s*([A-D、]+)\s*$/);
    
    if (ansMatch) {
      // If we found a new "答案：" line, the content before it (and possibly previous lines) is the question
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      let qTextPart = ansMatch[1].trim(); 
      const answerStr = ansMatch[2].trim();
      const answers = answerStr.split('、');

      // Look backwards for more question text lines
      // We stop if we hit an Option line, a previous Answer line, or a Section Header (starts with Chinese number like "一、")
      let j = i - 1;
      const collectedLines = [];
      while (j >= 0) {
        const prevLine = lines[j];
        // Stop conditions
        if (prevLine.match(/^[A-D]\./)) break; // Hit an option
        if (prevLine.includes('答案：')) break; // Hit previous answer
        if (prevLine.match(/^[一二三四五六七八九十]、/)) break; // Hit a section header

        if (prevLine.trim()) {
            collectedLines.unshift(prevLine.trim());
        }
        j--;
      }
      
      let fullQuestionText = [...collectedLines, qTextPart].join(' ').trim();
      // Remove leading number (e.g., "1.", "120.")
      fullQuestionText = fullQuestionText.replace(/^\d+\.\s*/, '');

      currentQuestion = {
        id: `${grade}_${idCounter++}`,
        grade: grade,
        type: answers.length > 1 ? 'multiple' : 'single',
        question: fullQuestionText,
        options: {},
        answer: answers
      };
      continue;
    }

    // Check if it's an option line (e.g., "A. xxxxx")
    const optMatch = line.match(/^([A-D])\.\s*(.*)$/);
    if (optMatch && currentQuestion) {
      currentQuestion.options[optMatch[1]] = optMatch[2].trim();
      continue;
    }
  }
  
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  
  return questions;
};

const p13 = parseFile('src/data/raw_p13.txt', 'primary_1_3');
const p46 = parseFile('src/data/raw_p46.txt', 'primary_4_6');
const jh1 = parseFile('src/data/raw_jh.txt', 'junior_high');

// Output grade 1-3 separately as requested
fs.writeFileSync('src/data/p13_questions.json', JSON.stringify(p13, null, 2));

const allQuestions = [...p13, ...p46, ...jh1];
fs.writeFileSync('src/data/parsed_questions.json', JSON.stringify(allQuestions, null, 2));

console.log(`Parsed ${p13.length} grade 1-3 questions into p13_questions.json`);
console.log(`Parsed ${p46.length} grade 4-6 questions`);
console.log(`Parsed ${jh1.length} junior high questions`);
console.log(`Parsed total ${allQuestions.length} questions into parsed_questions.json`);
