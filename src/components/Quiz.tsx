import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GradeLevel, Question } from '../types';
import { CheckCircle2, XCircle, AlertCircle, Timer } from 'lucide-react';
import allQuestions from '../data/parsed_questions.json';
import p13Questions from '../data/p13_questions.json';

interface Props {
  grade: GradeLevel;
  onComplete: (score: number, total: number) => void;
}

const QUIZ_TIME_LIMIT_PER_QUESTION = 30; // 30 seconds per question
const MAX_QUESTIONS = 1000; // Increased limit to include all questions

// 播放答对音效 - 使用 Web Audio API 生成悦耳的成功音效
const playCorrectSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    // 创建两个振荡器来产生和弦音效
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 设置频率 - 大三和弦 (C 和 E)
    oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
    
    // 设置波形
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';
    
    // 设置音量包络
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    // 播放
    oscillator1.start(audioContext.currentTime);
    oscillator2.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 0.5);
    oscillator2.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log('Audio play failed:', e);
  }
};

// 播放答错音效 - 使用 Web Audio API 生成低沉的错误音效
const playWrongSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 设置频率 - 低沉的音符
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.3);
    
    // 设置波形 - 锯齿波产生更刺耳的声音
    oscillator.type = 'sawtooth';
    
    // 设置音量包络
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    // 播放
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (e) {
    console.log('Audio play failed:', e);
  }
};

export default function Quiz({ grade, onComplete }: Props) {
  const [gradeQuestions, setGradeQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoreRef = useRef(score);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    let finalQuestions: Question[] = [];
    
    if (grade === 'primary_1_3') {
      // Use the separate 1-3 grade question bank
      const p13 = p13Questions as Question[];
      // Randomly pick 100 questions for practice
      let shuffled = [...p13].sort(() => Math.random() - 0.5);
      finalQuestions = shuffled.slice(0, Math.min(100, shuffled.length));
    } else if (grade === 'junior_high') {
      // For junior high, select 30 multiple choice and 70 single choice
      const juniorQuestions = (allQuestions as Question[]).filter(q => q.grade === 'junior_high');
      
      const singleChoice = juniorQuestions.filter(q => q.type === 'single');
      const multipleChoice = juniorQuestions.filter(q => q.type === 'multiple');
      
      const shuffledSingle = [...singleChoice].sort(() => Math.random() - 0.5);
      const shuffledMultiple = [...multipleChoice].sort(() => Math.random() - 0.5);
      
      const selectedSingle = shuffledSingle.slice(0, Math.min(70, shuffledSingle.length));
      const selectedMultiple = shuffledMultiple.slice(0, Math.min(30, shuffledMultiple.length));
      
      // Combine without shuffling again to keep Single then Multiple order
      finalQuestions = [...selectedSingle, ...selectedMultiple];
    } else {
      // For other grades, randomly pick 100 questions
      const gradeQs = (allQuestions as Question[]).filter(q => q.grade === grade);
      let shuffled = [...gradeQs].sort(() => Math.random() - 0.5);
      finalQuestions = shuffled.slice(0, Math.min(100, shuffled.length));
    }

    if (finalQuestions.length === 0) return;

    setGradeQuestions(finalQuestions);
    // Fixed 15 minutes (900 seconds) for all quizzes
    setTimeLeft(900);
  }, [grade]);

  useEffect(() => {
    if (gradeQuestions.length === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Time's up, finish the quiz
          onComplete(scoreRef.current, gradeQuestions.length);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gradeQuestions.length, onComplete]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (gradeQuestions.length === 0) {
    return <div className="text-center py-12">加载题目中...</div>;
  }

  const currentQuestion = gradeQuestions[currentIndex];
  const isMultiple = currentQuestion.type === 'multiple';

  const handleOptionClick = (optionKey: string) => {
    if (isSubmitted) return;

    if (isMultiple) {
      setSelectedOptions(prev => 
        prev.includes(optionKey) 
          ? prev.filter(k => k !== optionKey)
          : [...prev, optionKey].sort()
      );
    } else {
      setSelectedOptions([optionKey]);
    }
  };

  const handleNext = () => {
    if (currentIndex < gradeQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptions([]);
      setIsSubmitted(false);
    } else {
      onComplete(scoreRef.current, gradeQuestions.length);
    }
  };

  const handleSkip = () => {
    if (isSubmitted) return;
    handleNext();
  };

  const handleSubmit = () => {
    if (selectedOptions.length === 0 || isSubmitted) return;
    
    setIsSubmitted(true);
    
    const isCorrect = 
      selectedOptions.length === currentQuestion.answer.length &&
      selectedOptions.every(opt => currentQuestion.answer.includes(opt));
      
    if (isCorrect) {
      setScore(prev => prev + 1);
      playCorrectSound(); // 播放答对音效
      timeoutRef.current = setTimeout(() => {
        handleNext();
      }, 200);
    } else {
      playWrongSound(); // 播放答错音效
      timeoutRef.current = setTimeout(() => {
        handleNext();
      }, 800);
    }
  };

  const isCorrect = isSubmitted && 
    selectedOptions.length === currentQuestion.answer.length &&
    selectedOptions.every(opt => currentQuestion.answer.includes(opt));

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex justify-between items-center text-sm text-stone-500 font-medium bg-white p-4 rounded-2xl shadow-sm border border-stone-200">
        <div className="flex items-center gap-4">
          <span className="bg-stone-100 px-3 py-1 rounded-lg">进度: {currentIndex + 1} / {gradeQuestions.length}</span>
          <span className="bg-red-50 text-red-700 px-3 py-1 rounded-lg">得分: {score}</span>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-stone-100 text-stone-700'}`}>
          <Timer className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="w-full bg-stone-200 h-2 rounded-full mb-8 overflow-hidden">
        <motion.div 
          className="bg-red-600 h-full"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex) / gradeQuestions.length) * 100}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-stone-200"
        >
          <div className="flex items-start gap-3 mb-6">
            <span className="shrink-0 bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">
              {isMultiple ? '多选题' : '单选题'}
            </span>
            <h2 className="text-xl font-semibold leading-snug">
              {currentQuestion.question}
            </h2>
          </div>

          <div className="space-y-3 mb-8">
            {Object.entries(currentQuestion.options).map(([key, value]) => {
              const isSelected = selectedOptions.includes(key);
              const isAnswer = currentQuestion.answer.includes(key);
              
              let optionClass = "border-stone-200 hover:border-red-300 hover:bg-red-50";
              if (isSelected) optionClass = "border-red-500 bg-red-50 text-red-900";
              
              if (isSubmitted) {
                if (isAnswer && isSelected) optionClass = "border-emerald-500 bg-emerald-50 text-emerald-900";
                else if (isAnswer && !isSelected) optionClass = "border-emerald-500 bg-emerald-50 text-emerald-900 border-dashed";
                else if (!isAnswer && isSelected) optionClass = "border-red-500 bg-red-50 text-red-900";
                else optionClass = "border-stone-200 opacity-50";
              }

              return (
                <button
                  key={key}
                  onClick={() => handleOptionClick(key)}
                  disabled={isSubmitted}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${optionClass}`}
                >
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full border ${isSelected ? 'bg-red-600 border-red-600 text-white' : 'border-stone-300 text-stone-500'} ${isSubmitted && isAnswer ? 'bg-emerald-600 border-emerald-600 text-white' : ''}`}>
                    {key}
                  </span>
                  <span className="flex-1">{value}</span>
                  {isSubmitted && isAnswer && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {isSubmitted && isSelected && !isAnswer && <XCircle className="w-5 h-5 text-red-600" />}
                </button>
              );
            })}
          </div>

          {isSubmitted && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${isCorrect ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}
            >
              {isCorrect ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
              )}
              <div>
                <p className="font-bold">{isCorrect ? '回答正确！即将进入下一题...' : '回答错误，即将进入下一题...'}</p>
                {!isCorrect && (
                  <p className="text-sm mt-1">正确答案是：{currentQuestion.answer.join('、')}</p>
                )}
              </div>
            </motion.div>
          )}

          <div className="flex justify-end gap-3">
            {!isSubmitted && (
              <>
                <button
                  onClick={handleSkip}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  跳过此题
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={selectedOptions.length === 0}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-medium transition-colors"
                >
                  提交答案
                </button>
              </>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
