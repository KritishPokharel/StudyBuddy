
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-studyneutral-300">
            &copy; {currentYear} StudyBuddy. All rights reserved.
          </div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/help" className="text-sm text-studyneutral-400 hover:text-studypurple-400 transition-colors">
              Help
            </Link>
            <Link to="/privacy" className="text-sm text-studyneutral-400 hover:text-studypurple-400 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-studyneutral-400 hover:text-studypurple-400 transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
