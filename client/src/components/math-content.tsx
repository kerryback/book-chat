import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import React from 'react';

interface MathContentProps {
  content: string;
  className?: string;
}

export function MathContent({ content, className = "" }: MathContentProps) {
  // Process content line by line to maintain order
  const processContent = (text: string) => {
    const lines = text.split('\n');
    const sections: string[] = [];
    let currentSection = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // If we hit a list item or header, and we have accumulated content, save it as a section
      if ((line.match(/^(\s*)-\s+/) || line.match(/^#{1,6}\s+/)) && currentSection.trim()) {
        sections.push(currentSection.trim());
        currentSection = line + '\n';
      } else {
        currentSection += line + '\n';
      }
    }
    
    // Add any remaining content
    if (currentSection.trim()) {
      sections.push(currentSection.trim());
    }
    
    return sections.filter(section => section.trim());
  };

  const sections = processContent(content);

  return (
    <div className={`prose prose-sm max-w-none overflow-visible ${className}`}>
      {sections.map((section, index) => (
        <ReactMarkdown
          key={index}
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
          {section}
        </ReactMarkdown>
      ))}
    </div>
  );
}