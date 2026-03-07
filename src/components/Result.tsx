import React from 'react';
import { motion } from 'motion/react';
import { Trophy, RotateCcw, Home } from 'lucide-react';

interface Props {
  score: number;
  total: number;
  onRestart: () => void;
}

export default function Result({ score, total, onRestart }: Props) {
  const percentage = Math.round((score / total) * 100);
  
  let message = '';
  if (percentage === 100) message = '太棒了！满分通过！';
  else if (percentage >= 80) message = '表现优秀！继续保持！';
  else if (percentage >= 60) message = '及格了，还有提升空间！';
  else message = '还需努力，多加练习哦！';

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm border border-stone-200 text-center"
    >
      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Trophy className="w-12 h-12 text-red-600" />
      </div>
      
      <h2 className="text-3xl font-bold mb-2 text-stone-900">练习完成</h2>
      <p className="text-stone-500 mb-8">{message}</p>
      
      <div className="bg-stone-50 rounded-2xl p-6 mb-8 flex justify-center items-center gap-8">
        <div>
          <p className="text-sm text-stone-500 mb-1">总题数</p>
          <p className="text-3xl font-bold text-stone-900">{total}</p>
        </div>
        <div className="w-px h-12 bg-stone-200"></div>
        <div>
          <p className="text-sm text-stone-500 mb-1">答对题数</p>
          <p className="text-3xl font-bold text-emerald-600">{score}</p>
        </div>
        <div className="w-px h-12 bg-stone-200"></div>
        <div>
          <p className="text-sm text-stone-500 mb-1">正确率</p>
          <p className="text-3xl font-bold text-red-600">{percentage}%</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 px-6 py-3 rounded-xl font-medium transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          重新练习
        </button>
        <button
          onClick={onRestart}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
        >
          <Home className="w-5 h-5" />
          返回首页
        </button>
      </div>
    </motion.div>
  );
}
