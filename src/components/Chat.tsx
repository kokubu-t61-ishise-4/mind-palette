import { useState, useEffect, useRef } from 'react';
import type { Message, ConversationState, OutputResult, ThemeType } from '../types';
import { sendMessage, detectTheme } from '../api/groq';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { OutputResultView } from './OutputResult';

const THEMES: { key: ThemeType; label: string; emoji: string }[] = [
  { key: 'worry', label: '悩み・モヤモヤ', emoji: '💭' },
  { key: 'goal', label: 'やりたいこと・目標', emoji: '🎯' },
  { key: 'idea', label: '企画・アイデア', emoji: '💡' },
  { key: 'work', label: '仕事の相談', emoji: '💼' },
  { key: 'relationship', label: '人間関係', emoji: '👥' },
  { key: 'career', label: '将来・キャリア', emoji: '🚀' },
  { key: 'self-discovery', label: '自分自身を知りたい', emoji: '🪞' },
];

const WELCOME_MESSAGE = `こんにちは！MindPaletteへようこそ。

ここは、あなたの頭の中を一緒に整理して、AIに相談するためのプロンプトを作る場所です。

悩みでも、やりたいことでも、ぼんやりした考えでも、なんでも大丈夫。
話しているうちに言葉になって、最後にはClaude や Gemini にそのまま渡せる形にまとめますね。

今日はどんなことについて話しましょうか？`;

const DEFAULT_OPTIONS = [
  'もう少し詳しく話したい',
  '別の角度から考えたい',
  'ここまでの内容を整理したい',
  'その他（自由に書く）',
];

export function Chat() {
  const [state, setState] = useState<ConversationState>({
    messages: [],
    phase: 'initial',
    theme: null,
    worryCategory: null,
    aiRequest: null,
    deepenCount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [outputResult, setOutputResult] = useState<OutputResult | null>(null);
  const [isAskingAiRequest, setIsAskingAiRequest] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.messages.length === 0) {
      const initialMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: WELCOME_MESSAGE,
      };
      setState((prev) => ({
        ...prev,
        messages: [initialMessage],
        phase: 'theme-selection',
      }));
    }
  }, [state.messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleThemeSelect = async (theme: ThemeType) => {
    const selectedTheme = THEMES.find((t) => t.key === theme);
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: selectedTheme ? `${selectedTheme.emoji} ${selectedTheme.label}` : theme,
    };

    const newMessages = [...state.messages, userMessage];

    setState((prev) => ({
      ...prev,
      messages: newMessages,
      theme: theme,
      phase: 'deepening',
      deepenCount: 1,
    }));

    setIsLoading(true);

    try {
      const response = await sendMessage(newMessages, false, theme);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        options: response.options && response.options.length > 0 ? response.options : DEFAULT_OPTIONS,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeInput = async (content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };

    const newMessages = [...state.messages, userMessage];

    setState((prev) => ({
      ...prev,
      messages: newMessages,
    }));

    setIsLoading(true);

    try {
      const detectedTheme = await detectTheme(content);

      setState((prev) => ({
        ...prev,
        theme: detectedTheme,
        phase: 'deepening',
        deepenCount: 1,
      }));

      const response = await sendMessage(newMessages, false, detectedTheme);

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        options: response.options && response.options.length > 0 ? response.options : DEFAULT_OPTIONS,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserMessage = async (content: string) => {
    if (state.phase === 'theme-selection') {
      await handleFreeInput(content);
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };

    const newMessages = [...state.messages, userMessage];
    const newDeepCount = state.deepenCount + 1;

    setState((prev) => ({
      ...prev,
      messages: newMessages,
      deepenCount: newDeepCount,
    }));

    if (content === 'まとめて出力する' || content === 'まとめに進む') {
      await generateSummary(newMessages);
      return;
    }

    if (isAskingAiRequest) {
      setIsAskingAiRequest(false);
      await generateSummaryWithRequest(newMessages, content);
      return;
    }

    setIsLoading(true);

    try {
      const response = await sendMessage(newMessages, false, state.theme || 'worry');

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.message,
        options: response.options && response.options.length > 0 ? response.options : DEFAULT_OPTIONS,
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        phase: response.shouldSummarize ? 'summarizing' : prev.phase,
      }));
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'エラーが発生しました。もう一度お試しください。',
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarizeClick = () => {
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'ここまでの内容をまとめますね。\n\nこのあと、ClaudeやGeminiにどんなことをしてほしいですか？\n例えば「アドバイスがほしい」「整理してほしい」「別の視点から意見がほしい」など、なんでも大丈夫です。',
      options: [
        'アドバイスがほしい',
        '整理・言語化してほしい',
        '別の視点から意見がほしい',
        'その他（自由に書く）',
      ],
    };

    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, assistantMessage],
    }));

    setIsAskingAiRequest(true);
  };

  const generateSummaryWithRequest = async (messages: Message[], aiRequest: string) => {
    setIsLoading(true);

    try {
      const messagesWithRequest = [
        ...messages,
        {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content: `AIへのリクエスト: ${aiRequest}`,
        },
      ];

      const response = await sendMessage(messagesWithRequest, true, state.theme || 'worry');

      if (response.summary && response.prompt) {
        setOutputResult({
          summary: response.summary,
          prompt: response.prompt,
        });
        setState((prev) => ({
          ...prev,
          phase: 'complete',
        }));
      }
    } catch (error) {
      console.error('Summary error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'まとめの生成中にエラーが発生しました。もう一度お試しください。',
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async (messages: Message[]) => {
    setIsLoading(true);

    try {
      const response = await sendMessage(messages, true, state.theme || 'worry');

      if (response.summary && response.prompt) {
        setOutputResult({
          summary: response.summary,
          prompt: response.prompt,
        });
        setState((prev) => ({
          ...prev,
          phase: 'complete',
        }));
      }
    } catch (error) {
      console.error('Summary error:', error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'まとめの生成中にエラーが発生しました。もう一度お試しください。',
      };
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setState({
      messages: [],
      phase: 'initial',
      theme: null,
      worryCategory: null,
      aiRequest: null,
      deepenCount: 0,
    });
    setOutputResult(null);
    setIsAskingAiRequest(false);
  };

  if (outputResult) {
    return <OutputResultView result={outputResult} onReset={handleReset} />;
  }

  const showSummarizeButton = state.phase === 'deepening' && state.deepenCount >= 1 && !isAskingAiRequest;

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {state.messages.map((message, index) => (
          <ChatMessage
            key={message.id}
            message={message}
            onOptionSelect={handleUserMessage}
            isLatest={index === state.messages.length - 1 && !isLoading}
          />
        ))}

        {state.phase === 'theme-selection' && !isLoading && state.messages.length > 0 && (
          <div className="theme-selection">
            <div className="theme-buttons">
              {THEMES.map((theme) => (
                <button
                  key={theme.key}
                  className="theme-button"
                  onClick={() => handleThemeSelect(theme.key)}
                >
                  <span className="theme-emoji">{theme.emoji}</span>
                  <span className="theme-label">{theme.label}</span>
                </button>
              ))}
            </div>
            <p className="theme-hint">または、自由に話しかけてください</p>
          </div>
        )}

        {isLoading && (
          <div className="message assistant">
            <div className="message-content loading">
              考え中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-footer">
        {showSummarizeButton && (
          <div className="summarize-button-container">
            <button
              className="summarize-button"
              onClick={handleSummarizeClick}
              disabled={isLoading}
            >
              まとめ／プロンプト作成に進む
            </button>
          </div>
        )}
        <ChatInput
          onSend={handleUserMessage}
          disabled={isLoading}
          placeholder={
            state.phase === 'theme-selection'
              ? '上のテーマを選ぶか、自由に話しかけてください...'
              : isAskingAiRequest
              ? 'AIにどうしてほしいか入力してください...'
              : '選択肢を選ぶか、自由に入力してください...'
          }
        />
      </div>
    </div>
  );
}
