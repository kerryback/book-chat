// @ts-ignore
import { InlineMath, BlockMath } from "react-katex";

interface MathContentProps {
  content: string;
}

interface MathExpression {
  start: number;
  end: number;
  content: string;
  type: 'block' | 'inline';
}

export function MathContent({ content }: MathContentProps) {
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
      
      // Add text before math
      if (expr.start > lastIndex) {
        const textBefore = text.slice(lastIndex, expr.start);
        if (textBefore) {
          parts.push(<span key={`text-${i}`}>{textBefore}</span>);
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

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText) {
        parts.push(<span key="text-end">{remainingText}</span>);
      }
    }

    return parts.length > 0 ? parts : [<span key="original">{text}</span>];
  };

  return (
    <div className="prose prose-sm max-w-none">
      <div className="whitespace-pre-wrap text-gray-900">
        {renderContent(content)}
      </div>
    </div>
  );
}