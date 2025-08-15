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
    <div className={`prose prose-sm max-w-none overflow-visible ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Ensure proper spacing around inline math
          p: ({ children }) => <p className="my-2">{children}</p>,
          // Style lists properly
          ul: ({ children }) => <ul className="my-2 ml-6 list-disc">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 ml-6 list-decimal">{children}</ol>,
          // Style headers
          h1: ({ children }) => <h1 className="text-2xl font-bold my-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold my-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold my-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-bold my-2">{children}</h4>,
          h5: ({ children }) => <h5 className="text-sm font-bold my-2">{children}</h5>,
          h6: ({ children }) => <h6 className="text-xs font-bold my-2">{children}</h6>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}