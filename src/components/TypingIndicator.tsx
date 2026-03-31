export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        <span className="typing-dot w-2 h-2 rounded-full bg-text-muted inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-text-muted inline-block" />
        <span className="typing-dot w-2 h-2 rounded-full bg-text-muted inline-block" />
      </div>
      <span className="text-text-muted text-xs ml-2">正在输入...</span>
    </div>
  );
}
