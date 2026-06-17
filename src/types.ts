export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  options?: string[];
}

export type ThemeType =
  | 'worry'           // 悩み・モヤモヤ
  | 'goal'            // やりたいこと・目標
  | 'idea'            // 企画・アイデア
  | 'work'            // 仕事の相談
  | 'relationship'    // 人間関係
  | 'career'          // 将来・キャリア
  | 'self-discovery'; // 自分自身を知りたい

export interface ConversationState {
  messages: Message[];
  phase: 'initial' | 'theme-selection' | 'deepening' | 'summarizing' | 'complete';
  theme: ThemeType | null;
  worryCategory: string | null;
  aiRequest: string | null;
  deepenCount: number;
}

export interface OutputResult {
  summary: string;
  prompt: string;
}
