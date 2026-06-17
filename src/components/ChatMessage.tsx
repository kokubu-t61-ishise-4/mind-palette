import type { Message } from '../types';

interface Props {
  message: Message;
  onOptionSelect?: (option: string) => void;
  isLatest?: boolean;
}

export function ChatMessage({ message, onOptionSelect, isLatest }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-content">
        {message.content}
      </div>

      {!isUser && message.options && isLatest && (
        <div className="options">
          {message.options.map((option, index) => (
            <button
              key={index}
              className="option-button"
              onClick={() => onOptionSelect?.(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
