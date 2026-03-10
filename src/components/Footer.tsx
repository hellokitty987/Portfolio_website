import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="w-full flex justify-center items-center p-5 mt-auto">
      <p className="text-sm text-white">Copyright © {currentYear} Jin Jessica Yang</p>
    </div>
  );
};

export default Footer;
