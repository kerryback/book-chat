import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MathContentProps {
  content: string;
  className?: string;
}

export function MathContent({ content, className = "" }: MathContentProps) {
  return (
    <div className={`${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        className="prose prose-sm max-w-none"
        components={{
          // Custom components to ensure proper rendering order
          p: ({ children, ...props }) => (
            <p className="my-3 text-gray-900 leading-relaxed" {...props}>
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul className="my-3 ml-6 list-disc space-y-1" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="my-3 ml-6 list-decimal space-y-1" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="text-gray-900" {...props}>
              {children}
            </li>
          ),
          h1: ({ children, ...props }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-lg font-bold mt-4 mb-2 text-gray-900" {...props}>
              {children}
            </h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}