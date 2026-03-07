import React, { useState } from 'react';
import { GradeLevel } from './types';
import GradeSelection from './components/GradeSelection';
import Quiz from './components/Quiz';
import Result from './components/Result';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'selection' | 'quiz' | 'result'>('selection');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel | null>(null);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const handleGradeSelect = (grade: GradeLevel) => {
    setSelectedGrade(grade);
    setCurrentScreen('quiz');
  };

  const handleQuizComplete = (finalScore: number, total: number) => {
    setScore(finalScore);
    setTotalQuestions(total);
    setCurrentScreen('result');
  };

  const handleRestart = () => {
    setCurrentScreen('selection');
    setSelectedGrade(null);
    setScore(0);
    setTotalQuestions(0);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
      <header className="bg-red-700 text-white p-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between relative">
          <img src="/1LOGO.png" alt="LOGO" className="h-8 w-auto object-contain" />
          <h1 className="text-xl font-bold tracking-wide absolute left-1/2 -translate-x-1/2">红色文化传承答题训练系统</h1>
          {selectedGrade && currentScreen === 'quiz' && (
            <button 
              onClick={handleRestart}
              className="text-sm bg-red-800 hover:bg-red-900 px-3 py-1 rounded-md transition-colors"
            >
              返回首页
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 py-8">
        {currentScreen === 'selection' && <GradeSelection onSelect={handleGradeSelect} />}
        {currentScreen === 'quiz' && selectedGrade && (
          <Quiz grade={selectedGrade} onComplete={handleQuizComplete} />
        )}
        {currentScreen === 'result' && (
          <Result score={score} total={totalQuestions} onRestart={handleRestart} />
        )}
      </main>
    </div>
  );
}

export default App;
