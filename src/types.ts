export type GradeLevel = 'primary_1_3' | 'primary_4_6' | 'junior_high';
export type QuestionType = 'single' | 'multiple' | 'judge';

export interface Question {
  id: string;
  grade: GradeLevel;
  type: QuestionType;
  question: string;
  options: Record<string, string>;
  answer: string[];
  explanation?: string;
}
