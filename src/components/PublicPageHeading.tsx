import React from 'react';

interface PublicPageHeadingProps {
  title: string;
  className?: string;
}

const PublicPageHeading: React.FC<PublicPageHeadingProps> = ({ title, className = '' }) => {
  return (
    <h1 className={`text-center text-4xl font-bold text-red-200 md:text-5xl ${className}`.trim()}>
      {title}
    </h1>
  );
};

export default PublicPageHeading;
