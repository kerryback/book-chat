// @ts-ignore
import { InlineMath, BlockMath } from "react-katex";
import React from "react";

interface MathContentProps {
  content: string;
  className?: string;
}

interface MathExpression {
  start: number;
  end: number;
  content: string;
  type: 'block' | 'inline';
}

export function MathContent({ content, className = "" }: MathContentProps) {
  // Helper function to parse markdown formatting (but preserve math expressions)
  const parseMarkdown = (text: string): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    let key = 0;
    
    // First, protect math expressions by replacing them with placeholders
    const mathPlaceholders: { [key: string]: string } = {};
    let placeholderCount = 0;
    
    // Protect math expressions - order matters, do multiline first
    const mathPatterns = [
      /\$\$([\s\S]*?)\$\$/g,  // Block math $$...$$
      /\\\[([\s\S]*?)\\\]/g,  // Block math \[...\]
      /\\\(([\s\S]*?)\\\)/g,  // Inline math \(...\)
      /\$([^$\r\n]*)\$/g      // Inline math $...$ (single line only)
    ];
    
    let protectedText = text;
    mathPatterns.forEach(pattern => {
      protectedText = protectedText.replace(pattern, (match) => {
        const placeholder = `__MATH_PLACEHOLDER_${placeholderCount}__`;
        mathPlaceholders[placeholder] = match;
        placeholderCount++;
        return placeholder;
      });
    });
    
    // Process block-level elements (headers and paragraphs only - no blockquotes)
    const lines = protectedText.split('\n');
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Handle headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const headerText = headerMatch[2];
        const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
        elements.push(
          <HeaderTag key={`header-${key++}`} className={`font-bold ${level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : level === 3 ? 'text-lg' : 'text-base'} my-2`}>
            {parseInlineMarkdown(headerText, mathPlaceholders)}
          </HeaderTag>
        );
      } else if (line.trim()) {
        // Regular paragraph
        elements.push(
          <p key={`paragraph-${key++}`} className="my-2">
            {parseInlineMarkdown(line, mathPlaceholders)}
          </p>
        );
      }
      i++;
    }
    
    return elements.length > 0 ? elements : [<span key="fallback">{restoreMathPlaceholders(protectedText, mathPlaceholders)}</span>];
  };
  
  // Helper function to parse inline markdown (bold, italic) and restore math placeholders
  const parseInlineMarkdown = (text: string, mathPlaceholders: { [key: string]: string } = {}): JSX.Element[] => {
    // First restore all math placeholders
    const restoredText = restoreMathPlaceholders(text, mathPlaceholders);
    
    const parts: JSX.Element[] = [];
    let remaining = restoredText;
    let key = 0;
    
    // Combined regex for bold and italic - avoid matching across math expressions
    const formattingRegex = /(\*\*\*([^*]+?)\*\*\*|\*\*([^*]+?)\*\*|\*([^*]+?)\*|__([^_]+?)__|_([^_]+?)_)/g;
    let lastIndex = 0;
    let match;
    
    while ((match = formattingRegex.exec(remaining)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = remaining.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push(<span key={`span-${key++}`}>{beforeText}</span>);
        }
      }
      
      // Add formatted text
      if (match[2]) { // *** bold italic ***
        parts.push(<strong key={`strong-italic-${key++}`}><em>{match[2]}</em></strong>);
      } else if (match[3] || match[5]) { // ** bold ** or __ bold __
        const boldText = match[3] || match[5];
        parts.push(<strong key={`strong-${key++}`}>{boldText}</strong>);
      } else if (match[4] || match[6]) { // * italic * or _ italic _
        const italicText = match[4] || match[6];
        parts.push(<em key={`em-${key++}`}>{italicText}</em>);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < remaining.length) {
      const remainingText = remaining.substring(lastIndex);
      if (remainingText) {
        parts.push(<span key={`span-${key++}`}>{remainingText}</span>);
      }
    }
    
    return parts.length > 0 ? parts : [<span key={`span-${key++}`}>{restoredText}</span>];
  };
  
  // Helper function to restore math placeholders
  const restoreMathPlaceholders = (text: string, mathPlaceholders: { [key: string]: string }): string => {
    let result = text;
    Object.keys(mathPlaceholders).forEach(placeholder => {
      result = result.replace(new RegExp(placeholder, 'g'), mathPlaceholders[placeholder]);
    });
    return result;
  };
  
  const renderContent = (text: string) => {
    const parts: JSX.Element[] = [];
    
    // First, handle lists by processing them line by line
    const lines = text.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let listItems: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const listMatch = line.match(/^(\s*)-\s+(.+)$/);
      
      if (listMatch) {
        inList = true;
        listItems.push(listMatch[2]); // Get content after "- "
      } else if (inList && line.trim() === '') {
        // Empty line ends the list
        if (listItems.length > 0) {
          parts.push(
            <ul key={`list-${parts.length}`} className="my-2 ml-6 list-disc">
              {listItems.map((item, idx) => (
                <li key={idx}>{renderMathInText(item)}</li>
              ))}
            </ul>
          );
          listItems = [];
        }
        inList = false;
      } else if (inList && !listMatch) {
        // Non-list line ends the list
        if (listItems.length > 0) {
          parts.push(
            <ul key={`list-${parts.length}`} className="my-2 ml-6 list-disc">
              {listItems.map((item, idx) => (
                <li key={idx}>{renderMathInText(item)}</li>
              ))}
            </ul>
          );
          listItems = [];
        }
        inList = false;
        processedLines.push(line);
      } else {
        processedLines.push(line);
      }
    }
    
    // Handle any remaining list items
    if (listItems.length > 0) {
      parts.push(
        <ul key={`list-${parts.length}`} className="my-2 ml-6 list-disc">
          {listItems.map((item, idx) => (
            <li key={idx}>{renderMathInText(item)}</li>
          ))}
        </ul>
      );
    }
    
    // Process remaining text line by line to avoid blockquote parsing
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];
      if (line.trim()) {
        // Check for headers
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const headerText = headerMatch[2];
          const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
          parts.push(
            <HeaderTag key={`header-${i}`} className={`font-bold ${level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : level === 3 ? 'text-lg' : 'text-base'} my-2`}>
              {renderMathInText(headerText)}
            </HeaderTag>
          );
        } else {
          // Regular paragraph
          parts.push(
            <p key={`paragraph-${i}`} className="my-2">
              {renderMathInText(line)}
            </p>
          );
        }
      }
    }
    
    return parts.length > 0 ? parts : [<span key="empty">No content</span>];
  };
  
  // Helper function to render math within text
  const renderMathInText = (text: string): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    
    // Use simpler regex patterns for better compatibility
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
    const inlineMathRegex = /\\\(([\s\S]*?)\\\)/g;
    const inlineDollarRegex = /\$([^$\n]+)\$/g;
    const blockMathBracketRegex = /\\\[([\s\S]*?)\\\]/g;

    const mathExpressions: MathExpression[] = [];
    
    // Find block math with $$
    let match: RegExpExecArray | null;
    while ((match = blockMathRegex.exec(text)) !== null) {
      mathExpressions.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1].trim(),
        type: 'block'
      });
    }

    // Find block math with \[...\]
    blockMathBracketRegex.lastIndex = 0;
    while ((match = blockMathBracketRegex.exec(text)) !== null) {
      mathExpressions.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1].trim(),
        type: 'block'
      });
    }

    // Find inline math with \(...\)
    inlineMathRegex.lastIndex = 0;
    while ((match = inlineMathRegex.exec(text)) !== null) {
      mathExpressions.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1].trim(),
        type: 'inline'
      });
    }

    // Find inline math with $...$
    inlineDollarRegex.lastIndex = 0;
    while ((match = inlineDollarRegex.exec(text)) !== null) {
      const isPartOfBlockMath = mathExpressions.some(expr => 
        match!.index >= expr.start && match!.index < expr.end
      );
      if (!isPartOfBlockMath) {
        mathExpressions.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[1].trim(),
          type: 'inline'
        });
      }
    }

    // Sort and filter overlapping expressions
    mathExpressions.sort((a, b) => a.start - b.start);
    
    const filteredExpressions: MathExpression[] = [];
    for (const expr of mathExpressions) {
      const hasOverlap = filteredExpressions.some(existing => 
        (expr.start < existing.end && expr.end > existing.start)
      );
      if (!hasOverlap) {
        filteredExpressions.push(expr);
      }
    }

    // Build the result
    let lastIndex = 0;
    for (let i = 0; i < filteredExpressions.length; i++) {
      const expr = filteredExpressions[i];
      
      // Add text before math - just plain text, no markdown parsing
      if (expr.start > lastIndex) {
        const textBefore = text.slice(lastIndex, expr.start).trim();
        if (textBefore) {
          parts.push(<span key={`text-${i}`}>{textBefore}</span>);
        }
      }

      // Add math expression
      try {
        if (expr.type === 'block') {
          parts.push(
            <div key={`math-${i}`} className="my-4 overflow-x-auto">
              <BlockMath math={expr.content} />
            </div>
          );
        } else {
          parts.push(
            <InlineMath key={`math-${i}`} math={expr.content} />
          );
        }
      } catch (error) {
        parts.push(
          <span key={`error-${i}`} className="text-red-600 font-mono text-sm bg-red-50 px-1 rounded">
            {text.slice(expr.start, expr.end)}
          </span>
        );
      }

      lastIndex = expr.end;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex).trim();
      if (remainingText) {
        parts.push(<span key="text-end">{remainingText}</span>);
      }
    }

    // If no math expressions found, just return plain text
    return parts.length > 0 ? parts : [<span key="plain-text">{text}</span>];
  };

  return (
    <div className={`prose prose-sm max-w-none overflow-visible ${className}`}>
      <div className="overflow-visible">
        {renderContent(content)}
      </div>
    </div>
  );
}