import { useState } from 'react';
import type { OutputResult } from '../types';

interface Props {
  result: OutputResult;
  onReset: () => void;
}

export function OutputResultView({ result, onReset }: Props) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const copyToClipboard = async (text: string, type: 'summary' | 'prompt') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'summary') {
        setCopiedSummary(true);
        setTimeout(() => setCopiedSummary(false), 2000);
      } else {
        setCopiedPrompt(true);
        setTimeout(() => setCopiedPrompt(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="output-result">
      <h2>整理完了!</h2>

      <div className="result-section">
        <div className="result-header">
          <h3>悩みの整理</h3>
          <button
            className="copy-button"
            onClick={() => copyToClipboard(result.summary, 'summary')}
          >
            {copiedSummary ? 'コピーしました!' : 'コピー'}
          </button>
        </div>
        <div className="result-content">
          {result.summary}
        </div>
      </div>

      <div className="result-section">
        <div className="result-header">
          <h3>Claude/Gemini用プロンプト</h3>
          <button
            className="copy-button"
            onClick={() => copyToClipboard(result.prompt, 'prompt')}
          >
            {copiedPrompt ? 'コピーしました!' : 'コピー'}
          </button>
        </div>
        <div className="result-content prompt">
          {result.prompt}
        </div>
      </div>

      <div className="result-actions">
        <button className="primary-button" onClick={onReset}>
          新しい悩みを整理する
        </button>
      </div>
    </div>
  );
}
