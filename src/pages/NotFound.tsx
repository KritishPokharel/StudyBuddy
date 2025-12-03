import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-foreground/80 mb-4">Oops! Page not found</p>
        <a href="/" className="text-studypurple-500 hover:text-studypurple-600 dark:text-studypurple-400 dark:hover:text-studypurple-300 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
