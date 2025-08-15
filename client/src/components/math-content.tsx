import MarkdownPreview from '@uiw/react-markdown-preview';
import 'katex/dist/katex.min.css';

interface MathContentProps {
  content: string;
  className?: string;
}

export function MathContent({ content, className = "" }: MathContentProps) {
  return (
    <div className={`prose prose-sm max-w-none overflow-visible ${className}`}>
      <MarkdownPreview
        source={content}
        style={{ 
          backgroundColor: 'transparent',
          fontFamily: 'inherit'
        }}
        wrapperElement={{
          "data-color-mode": "light"
        }}
        rehypePlugins={[
          [require('rehype-katex'), {}]
        ]}
        remarkPlugins={[
          [require('remark-math'), {}]
        ]}
      />
    </div>
  );
}