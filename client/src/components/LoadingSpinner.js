import React from 'react';

const LoadingSpinner = ({ size = 'large', text = 'Loading...', className = '' }) => {
  const getSizeClasses = (size) => {
    switch (size) {
      case 'small':
        return 'h-4 w-4';
      case 'medium':
        return 'h-8 w-8';
      case 'large':
        return 'h-12 w-12';
      case 'xl':
        return 'h-16 w-16';
      default:
        return 'h-12 w-12';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${getSizeClasses(size)}`} />
      {text && (
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
