import React from 'react';
import { CheckLg } from 'react-bootstrap-icons';
import './BookingProgressBar.css';

interface BookingProgressBarProps {
  currentStep: number;
  steps: string[]; // An array of step labels, e.g., ["Information", "Booking"]
}

export const BookingProgressBar: React.FC<BookingProgressBarProps> = ({ currentStep, steps }) => {
  const totalSteps = steps.length;

  // Calculate the width of the progress line.
  // Example: If on step 2 of 5, progress should be 1/4 of the way (25%).
  const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="progress-bar-container">
      {/* The blue line indicating progress */}
      <div className="progress-line" style={{ width: `${progressWidth}%` }}></div>
      
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        let stepClass = 'progress-step';
        if (stepNumber < currentStep) {
          stepClass += ' completed';
        } else if (stepNumber === currentStep) {
          stepClass += ' active';
        }

        return (
          <div key={label} className={stepClass}>
            {stepNumber < currentStep ? <CheckLg /> : stepNumber}
            <div className="step-label">{label}</div>
          </div>
        );
      })}
    </div>
  );
};