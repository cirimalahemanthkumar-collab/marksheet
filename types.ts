export interface SubjectScore {
  subject: string;
  score: number;
  fullMarks?: number;
}

export interface AnalysisResult {
  studentName: string;
  subjects: SubjectScore[];
  totalObtained: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  summary: string;
  feedback: string[];
}

export interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  message?: string;
}
