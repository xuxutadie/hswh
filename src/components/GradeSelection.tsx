import React from 'react';
import { motion } from 'motion/react';
import { GradeLevel } from '../types';
import { BookOpen, GraduationCap, School } from 'lucide-react';

interface Props {
  onSelect: (grade: GradeLevel) => void;
}

export default function GradeSelection({ onSelect }: Props) {
  const grades: { id: GradeLevel; title: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'primary_1_3',
      title: '小学 1-3 年级',
      icon: <BookOpen className="w-8 h-8 mb-2 text-red-600" />,
      desc: '红色精神与文化基础、英雄人物初识（280 题随机练习 100 题）'
    },
    {
      id: 'primary_4_6',
      title: '小学 4-6 年级',
      icon: <School className="w-8 h-8 mb-2 text-red-600" />,
      desc: '红色精神深入、重要历史事件与文艺作品（共 491 题）'
    },
    {
      id: 'junior_high',
      title: '初中组',
      icon: <GraduationCap className="w-8 h-8 mb-2 text-red-600" />,
      desc: '红色文化全面传承（共 1171 题，随机抽取 100 题）'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <h2 className="text-3xl font-bold mb-8 text-red-800">请选择您的年级段</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {grades.map((grade) => (
          <motion.button
            key={grade.id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(grade.id)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center text-center hover:shadow-md hover:border-red-300 transition-all"
          >
            {grade.icon}
            <h3 className="text-xl font-semibold mb-2">{grade.title}</h3>
            <p className="text-sm text-stone-500">{grade.desc}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
