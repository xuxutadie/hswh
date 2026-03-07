export type GradeLevel = 'primary_1_3' | 'primary_4_6' | 'junior_high';
export type QuestionType = 'single' | 'multiple';

export interface Question {
  id: string;
  grade: GradeLevel;
  type: QuestionType;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string[];
}
