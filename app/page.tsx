'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  const [currentTypingContent, setCurrentTypingContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTypingContent]);

  // Typing effect for incoming response
  useEffect(() => {
    if (!typingMessage) return;

    let index = 0;
    const interval = setInterval(() => {
      setCurrentTypingContent((prev) => prev + typingMessage.charAt(index));
      index++;

      if (index >= typingMessage.length) {
        clearInterval(interval);
        setMessages((prev) => [...prev, { role: 'model', content: typingMessage }]);
        setTypingMessage('');
        setCurrentTypingContent('');
      }
    }, 15);

    return () => clearInterval(interval);
  }, [typingMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Securely call the backend API route instead of the Gemini SDK directly
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response from backend');
      }

      const data = await response.json();
      setIsLoading(false);
      setTypingMessage(data.text);
    } catch (error: any) {
      if (error.name === 'AbortError') return;

      console.error('Error generating content:', error);
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24 max-w-4xl mx-auto">
      <div className="z-10 w-full flex-col items-center justify-between font-mono text-sm flex">
        <h1 className="text-2xl font-bold mb-8 text-center">Gemini AI Assistant</h1>

        <div className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 min-h-[500px] flex flex-col justify-between">
          <div className="space-y-4 mb-4 overflow-y-auto max-h-[600px] pr-2">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-blue-600 ml-auto text-white'
                    : 'bg-slate-800 text-slate-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}

            {/* Show streamed/typing response */}
            {currentTypingContent && (
              <div className="p-3 rounded-lg max-w-[80%] bg-slate-800 text-slate-100">
                <p className="whitespace-pre-wrap">{currentTypingContent}</p>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && !currentTypingContent && (
              <div className="p-3 rounded-lg max-w-[80%] bg-slate-800 text-slate-400 animate-pulse">
                Thinking...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Gemini anything..."
              disabled={isLoading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-4 py-2 text-slate-100 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:hover:bg-blue-600"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
