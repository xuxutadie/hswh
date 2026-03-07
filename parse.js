import fs from 'fs';

const parseFile = (filename, grade) => {
  if (!fs.existsSync(filename)) return [];
  const content = fs.readFileSync(filename, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  
  const questions = [];
  let currentQuestion = null;
  let idCounter = 1;
  let isMultiple = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check if it's a question line
    const qMatch = line.match(/^\d+\.(.*?)\s*答案：([A-D、]+)$/);
    if (qMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      const qText = qMatch[1].trim();
      const answerStr = qMatch[2].trim();
      const answers = answerStr.split('、');
      
      isMultiple = answers.length > 1;
      
      currentQuestion = {
        id: `${grade}_${idCounter++}`,
        grade: grade,
        type: isMultiple ? 'multiple' : 'single',
        question: qText,
        options: {},
        answer: answers
      };
      continue;
    }
    
    // Check if it's an option line
    const optMatch = line.match(/^([A-D])\.\s*(.*)$/);
    if (optMatch && currentQuestion) {
      currentQuestion.options[optMatch[1]] = optMatch[2].trim();
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
const jh2 = parseFile('src/data/raw_jh_2.txt', 'junior_high');

const allQuestions = [...p13, ...p46, ...jh1, ...jh2];

fs.writeFileSync('src/data/parsed_questions.json', JSON.stringify(allQuestions, null, 2));
console.log(`Parsed ${allQuestions.length} questions`);
