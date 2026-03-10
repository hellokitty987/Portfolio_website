import React, { useEffect } from 'react';

const TableauEmbed = ({ url }: { url: string }) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js';
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <tableau-viz src={url} toolbar="bottom" hide-tabs width="1440px" height="1000px" />;
};

export default TableauEmbed;
