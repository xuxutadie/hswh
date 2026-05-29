import fs from 'fs';

const SECTION_HEADERS = [
  { pattern: /序号\s*单选/i, type: 'single' },
  { pattern: /序号\s*多选/i, type: 'multiple' },
  { pattern: /序号\s*判断/i, type: 'judge' }
];

const JUDGE_OPTIONS = {
  A: '正确',
  B: '错误'
};

const normalizeLine = (line) =>
  line
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();

const expandMergedOptions = (line) =>
  line
    .replace(/([A-D]\.[^\n]*?)\s+([A-D]\.)/g, '$1\n$2')
    .replace(/([A-D]\.[^\n]*?)\s+([A-D]\.)/g, '$1\n$2');

const splitColumns = (line) =>
  line
    .split(/\s{2,}/)
    .map((part) => normalizeLine(part))
    .filter(Boolean);

const normalizeQuestionText = (lines) =>
  lines
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([，。！？；：、“”《》（）])/g, '$1')
    .replace(/([（《“])\s+/g, '$1')
    .replace(/\s+([）》。！？；：”])/g, '$1')
    .trim();

const normalizeExplanation = (lines) => {
  const text = normalizeQuestionText(lines);
  return text || undefined;
};

const parseSelectionAnswer = (value) => {
  const normalized = normalizeLine(value).replace(/[、，,\s]/g, '');
  return /^[A-D]+$/.test(normalized) ? normalized.split('') : null;
};

const extractTrailingSelectionAnswer = (value) => {
  const normalized = normalizeLine(value);
  const match = normalized.match(/^(.*?)(?:\s+([A-D]{1,4}))$/);

  if (!match) {
    return { text: normalized, answer: null };
  }

  const answer = parseSelectionAnswer(match[2]);
  if (!answer) {
    return { text: normalized, answer: null };
  }

  return { text: normalizeLine(match[1]), answer };
};

const parseStructuredOptionLine = (rawLine) => {
  const columns = splitColumns(rawLine);
  if (columns.length === 0) return null;

  if (/^\d+$/.test(columns[0]) && columns[1]) {
    const optionMatch = columns[1].match(/^([A-D])\.\s*(.*)$/);
    if (optionMatch) {
      const tail = columns.slice(2);
      const maybeAnswer = parseSelectionAnswer(tail[tail.length - 1] ?? '');
      if (maybeAnswer) {
        tail.pop();
      }

      return {
        questionNumber: Number(columns[0]),
        optionKey: optionMatch[1],
        optionText: normalizeQuestionText([optionMatch[2], ...tail]),
        answer: maybeAnswer
      };
    }
  }

  const optionMatch = columns[0].match(/^([A-D])\.\s*(.*)$/);
  if (!optionMatch) return null;

  const tail = columns.slice(1);
  const maybeAnswer = parseSelectionAnswer(tail[tail.length - 1] ?? '');
  if (maybeAnswer) {
    tail.pop();
  }

  return {
    questionNumber: null,
    optionKey: optionMatch[1],
    optionText: normalizeQuestionText([optionMatch[2], ...tail]),
    answer: maybeAnswer
  };
};

const createQuestion = (grade, type, idCounter) => ({
  id: `${grade}_${idCounter}`,
  grade,
  type,
  questionLines: [],
  options: type === 'judge' ? { ...JUDGE_OPTIONS } : {},
  answer: [],
  explanationLines: [],
  lastOptionKey: null
});

const finalizeQuestion = (questions, current) => {
  if (!current) return;

  const questionText = normalizeQuestionText(current.questionLines);
  if (!questionText || current.answer.length === 0) return;

  questions.push({
    id: current.id,
    grade: current.grade,
    type: current.type,
    question: questionText,
    options: current.options,
    answer: current.answer,
    explanation: normalizeExplanation(current.explanationLines)
  });
};

const shouldSkipStandalonePageNumber = (lines, index, expectedNumber) => {
  const line = normalizeLine(lines[index] ?? '');
  if (!/^\d+$/.test(line)) return false;

  const nextLine = normalizeLine(lines[index + 1] ?? '');
  if (SECTION_HEADERS.some(({ pattern }) => pattern.test(nextLine))) return true;

  return Number(line) !== expectedNumber;
};

const consumeSelectionLine = (current, rawLine) => {
  const line = normalizeLine(rawLine);
  if (!line) return;

  const parsedOption = parseStructuredOptionLine(rawLine);
  if (parsedOption) {
    current.options[parsedOption.optionKey] = parsedOption.optionText;
    current.lastOptionKey = parsedOption.optionKey;

    if (parsedOption.answer) {
      current.answer = parsedOption.answer;
    }
    return;
  }

  const directAnswer = parseSelectionAnswer(line);
  if (directAnswer) {
    current.answer = directAnswer;
    return;
  }

  const { text, answer } = extractTrailingSelectionAnswer(line);
  if (answer) {
    current.answer = answer;
  }

  if (!text) return;

  if (Object.keys(current.options).length > 0 && current.lastOptionKey) {
    current.options[current.lastOptionKey] = normalizeQuestionText([
      current.options[current.lastOptionKey],
      text
    ]);
    return;
  }

  current.questionLines.push(text);
};

const hasAllSelectionOptions = (current) =>
  ['A', 'B', 'C', 'D'].every((key) => key in current.options);

const consumeJudgeLine = (current, rawLine) => {
  const columns = splitColumns(rawLine);
  if (columns.length === 0) return;

  const answerIndex = columns.findIndex((part) => part === '√' || part === '×');
  if (answerIndex >= 0) {
    const before = columns.slice(0, answerIndex);
    const after = columns.slice(answerIndex + 1);

    if (before.length > 0) {
      current.questionLines.push(before.join(' '));
    }

    current.answer = [columns[answerIndex] === '√' ? 'A' : 'B'];

    if (after.length > 0) {
      current.explanationLines.push(after.join(' '));
    }
    return;
  }

  if (current.answer[0] === 'B' && columns.length >= 2) {
    current.questionLines.push(columns[0]);
    current.explanationLines.push(columns.slice(1).join(' '));
    return;
  }

  current.questionLines.push(columns.join(' '));
};

const parseStructuredFile = (filename, grade) => {
  if (!fs.existsSync(filename)) return [];

  const rawLines = fs.readFileSync(filename, 'utf-8').split(/\r?\n/);
  const questions = [];
  let currentSectionType = null;
  let expectedNumber = 1;
  let current = null;
  let prelude = [];
  let postlude = [];
  let idCounter = 1;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const line = normalizeLine(rawLine);
    if (!line) continue;

    const section = SECTION_HEADERS.find(({ pattern }) => pattern.test(line));
    if (section) {
      if (current && currentSectionType !== 'judge' && postlude.length > 0) {
        postlude
          .filter((entry) => {
            const value = normalizeLine(entry);
            return value && !/^\d+$/.test(value) && !SECTION_HEADERS.some(({ pattern }) => pattern.test(value));
          })
          .forEach((entry) => consumeSelectionLine(current, entry));
      }
      finalizeQuestion(questions, current);
      current = null;
      prelude = [];
      postlude = [];
      currentSectionType = section.type;
      expectedNumber = 1;
      continue;
    }

    if (!currentSectionType) continue;
    if (shouldSkipStandalonePageNumber(rawLines, i, expectedNumber)) continue;

    const optionInfo = currentSectionType === 'judge' ? null : parseStructuredOptionLine(rawLine);
    const questionStart = line.match(/^(\d+)(?:\s+(.*))?$/);
    const questionNumber = questionStart ? Number(questionStart[1]) : null;
    const restOfLine = questionStart ? normalizeLine(questionStart[2] ?? '') : '';

    if (optionInfo?.questionNumber === expectedNumber || questionNumber === expectedNumber) {
      if (current && currentSectionType !== 'judge') {
        finalizeQuestion(questions, current);
        current = null;
      }

      const effectiveNumber = optionInfo?.questionNumber ?? questionNumber;
      if (effectiveNumber !== expectedNumber) {
        continue;
      }

      finalizeQuestion(questions, current);
      current = createQuestion(grade, currentSectionType, idCounter++);
      expectedNumber += 1;
      postlude = [];

      if (currentSectionType !== 'judge') {
        prelude.forEach((entry) => consumeSelectionLine(current, entry));
        prelude = [];

        if (optionInfo) {
          consumeSelectionLine(current, rawLine);
        } else if (restOfLine) {
          consumeSelectionLine(current, restOfLine);
        }
      } else if (restOfLine) {
        consumeJudgeLine(current, restOfLine);
      }
      continue;
    }

    if (currentSectionType === 'judge') {
      if (current) {
        consumeJudgeLine(current, rawLine);
      }
      continue;
    }

    if (!current) {
      prelude.push(rawLine);
      continue;
    }

    if (current.answer.length > 0 && hasAllSelectionOptions(current)) {
      postlude.push(rawLine);
      continue;
    }

    consumeSelectionLine(current, rawLine);
  }

  if (current && currentSectionType !== 'judge' && postlude.length > 0) {
    postlude
      .filter((entry) => {
        const value = normalizeLine(entry);
        return value && !/^\d+$/.test(value) && !SECTION_HEADERS.some(({ pattern }) => pattern.test(value));
      })
      .forEach((entry) => consumeSelectionLine(current, entry));
  }

  finalizeQuestion(questions, current);
  return questions;
};

const parseLegacyAnswerFile = (filename, grade) => {
  if (!fs.existsSync(filename)) return [];

  const lines = expandMergedOptions(
    fs.readFileSync(filename, 'utf-8').replace(/([A-D]\.[^\n]*?)\s+(\d+\.)/g, '$1\n$2')
  )
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  const questions = [];
  let currentQuestion = null;
  let pendingQuestion = '';
  let idCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const questionMatch = line.match(/^(\d+)\.\s*(.*)$/);
    if (questionMatch) {
      pendingQuestion = questionMatch[2].trim();
      continue;
    }

    const answerMatch = line.match(/^(.*?)\s*答案：\s*([A-D、]+)\s*$/);
    if (answerMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      const answers = answerMatch[2].split('、');
      currentQuestion = {
        id: `${grade}_${idCounter++}`,
        grade,
        type: answers.length > 1 ? 'multiple' : 'single',
        question: answerMatch[1].replace(/^\d+\.\s*/, '').trim() || pendingQuestion,
        options: {},
        answer: answers
      };
      continue;
    }

    const optionMatch = line.match(/^([A-D])\.\s*(.*)$/);
    if (optionMatch && currentQuestion) {
      currentQuestion.options[optionMatch[1]] = optionMatch[2].trim();
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions;
};

const p13 = parseLegacyAnswerFile('src/data/raw_p13.txt', 'primary_1_3');
const p46 = parseStructuredFile('src/data/raw_p46.txt', 'primary_4_6');
const jh1 = parseStructuredFile('src/data/raw_jh.txt', 'junior_high');

fs.writeFileSync('src/data/p13_questions.json', JSON.stringify(p13, null, 2));

const allQuestions = [...p13, ...p46, ...jh1];
fs.writeFileSync('src/data/parsed_questions.json', JSON.stringify(allQuestions, null, 2));

console.log(`Parsed ${p13.length} grade 1-3 questions into p13_questions.json`);
console.log(`Parsed ${p46.length} grade 4-6 questions`);
console.log(`Parsed ${jh1.length} junior high questions`);
console.log(`Parsed total ${allQuestions.length} questions into parsed_questions.json`);
