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
    
    // Protect math expressions
    const mathPatterns = [
      /\$\$([\s\S]*?)\$\$/g,
      /\\\[([\s\S]*?)\\\]/g,
      /\\\(([\s\S]*?)\\\)/g,
      /\$([^$\n]+)\$/g
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
    
    // Process headers first (###, ##, #)
    const headerRegex = /^(#{1,6})\s+(.+)$/gm;
    const headerSplit = protectedText.split(headerRegex);
    
    for (let i = 0; i < headerSplit.length; i++) {
      if (i % 3 === 1) { // This is the # symbols
        const level = headerSplit[i].length;
        const headerText = headerSplit[i + 1];
        const HeaderTag = `h${level}` as keyof JSX.IntrinsicElements;
        elements.push(
          <HeaderTag key={`header-${key++}`} className={`font-bold ${level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : level === 3 ? 'text-lg' : 'text-base'} my-2`}>
            {parseInlineMarkdown(headerText, mathPlaceholders)}
          </HeaderTag>
        );
        i += 1; // Skip the header text as we've already processed it
      } else if (i % 3 === 0 && headerSplit[i]) { // Regular text
        elements.push(...parseInlineMarkdown(headerSplit[i], mathPlaceholders).map((el, idx) => 
          React.cloneElement(el, { key: `text-${key++}-${idx}` })
        ));
      }
    }
    
    return elements.length > 0 ? elements : parseInlineMarkdown(protectedText, mathPlaceholders);
  };
  
  // Helper function to parse inline markdown (bold, italic) and restore math placeholders
  const parseInlineMarkdown = (text: string, mathPlaceholders: { [key: string]: string } = {}): JSX.Element[] => {
    const parts: JSX.Element[] = [];
    let remaining = text;
    let key = 0;
    
    // Combined regex for bold and italic
    const formattingRegex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_)/;
    
    while (remaining) {
      const match = remaining.match(formattingRegex);
      
      if (!match) {
        if (remaining) {
          // Restore math placeholders in the final text
          const restoredText = restoreMathPlaceholders(remaining, mathPlaceholders);
          parts.push(<span key={`span-${key++}`}>{restoredText}</span>);
        }
        break;
      }
      
      // Add text before the match
      if (match.index! > 0) {
        const beforeText = remaining.substring(0, match.index);
        const restoredBeforeText = restoreMathPlaceholders(beforeText, mathPlaceholders);
        parts.push(<span key={`span-${key++}`}>{restoredBeforeText}</span>);
      }
      
      // Add formatted text
      if (match[2]) { // *** bold italic ***
        const restoredText = restoreMathPlaceholders(match[2], mathPlaceholders);
        parts.push(<strong key={`strong-italic-${key++}`}><em>{restoredText}</em></strong>);
      } else if (match[3] || match[5]) { // ** bold ** or __ bold __
        const boldText = match[3] || match[5];
        const restoredText = restoreMathPlaceholders(boldText, mathPlaceholders);
        parts.push(<strong key={`strong-${key++}`}>{restoredText}</strong>);
      } else if (match[4] || match[6]) { // * italic * or _ italic _
        const italicText = match[4] || match[6];
        const restoredText = restoreMathPlaceholders(italicText, mathPlaceholders);
        parts.push(<em key={`em-${key++}`}>{restoredText}</em>);
      }
      
      remaining = remaining.substring(match.index! + match[0].length);
    }
    
    return parts;
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
      
      // Add text before math with markdown parsing
      if (expr.start > lastIndex) {
        const textBefore = text.slice(lastIndex, expr.start);
        if (textBefore) {
          const markdownElements = parseMarkdown(textBefore);
          parts.push(<span key={`text-${i}`}>{markdownElements}</span>);
        }
      }

      // Add math expression
      try {
        if (expr.type === 'block') {
          parts.push(
            <div key={`math-${i}`} className="my-4 text-center">
              <BlockMath math={expr.content} />
            </div>
          );
        } else {
          parts.push(
            <span key={`math-${i}`} className="mx-1">
              <InlineMath math={expr.content} />
            </span>
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

    // Add remaining text with markdown parsing
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText) {
        const markdownElements = parseMarkdown(remainingText);
        parts.push(<span key="text-end">{markdownElements}</span>);
      }
    }

    // If no math expressions found, just parse the whole text as markdown
    return parts.length > 0 ? parts : parseMarkdown(text);
  };

  return (
    <div className={`prose prose-sm max-w-none overflow-visible ${className}`}>
      <div className="whitespace-pre-wrap overflow-visible">
        {renderContent(content)}
      </div>
    </div>
  );
}