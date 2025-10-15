import React from 'react';

interface LinkifyTextProps {
  text: string;
  className?: string;
}

const LinkifyText: React.FC<LinkifyTextProps> = ({ text, className = '' }) => {
  // URL regex pattern
  const urlPattern = /(https?:\/\/[^\s]+)/g;

  const parts = text.split(urlPattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(urlPattern)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export default LinkifyText;
