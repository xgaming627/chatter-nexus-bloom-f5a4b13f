import React from 'react';

interface LinkifyTextProps {
  text: string;
  className?: string;
}

const LinkifyText: React.FC<LinkifyTextProps> = ({ text, className = '' }) => {
  // Parse text for URLs, bold (**text**), and italic (*text*)
  const parseText = (input: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Combined pattern for URLs, bold, and italic
    const pattern = /(https?:\/\/[^\s]+)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
    let match;
    
    while ((match = pattern.exec(input)) !== null) {
      // Add text before match
      if (match.index > currentIndex) {
        elements.push(
          <span key={`text-${currentIndex}`}>
            {input.substring(currentIndex, match.index)}
          </span>
        );
      }
      
      if (match[1]) {
        // URL match
        elements.push(
          <a
            key={`link-${match.index}`}
            href={match[1]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary/80 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {match[1]}
          </a>
        );
      } else if (match[2]) {
        // Bold match (**text**)
        elements.push(
          <strong key={`bold-${match.index}`} className="font-bold">
            {match[3]}
          </strong>
        );
      } else if (match[4]) {
        // Italic match (*text*)
        elements.push(
          <em key={`italic-${match.index}`} className="italic">
            {match[5]}
          </em>
        );
      }
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < input.length) {
      elements.push(
        <span key={`text-${currentIndex}`}>
          {input.substring(currentIndex)}
        </span>
      );
    }
    
    return elements;
  };

  return (
    <span className={className}>
      {parseText(text)}
    </span>
  );
};

export default LinkifyText;
