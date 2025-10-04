import React from 'react';
import { CheckLg } from 'react-bootstrap-icons';
import './bookingProgressBar.css';

interface BookingProgressBarProps {
  currentStep: number;
  steps: string[]; // An array of step labels, e.g., ["Information", "Booking"]
}

export const BookingProgressBar: React.FC<BookingProgressBarProps> = ({ currentStep, steps }) => {
  const totalSteps = steps.length;

  // --- NEW, CORRECTED LOGIC FOR THE LINE WIDTH ---
  // The width should never exceed 100%. Math.min ensures this.
  const progressWidth = Math.min(((currentStep - 1) / (totalSteps - 1)) * 100, 100);

  return (
    <div className="progress-bar-container">
      <div className="progress-line" style={{ width: `${progressWidth}%` }}></div>
      
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        let stepClass = 'progress-step';

        // --- NEW, CORRECTED LOGIC FOR THE STEP CLASS ---
        // A step is now 'completed' if the current step is greater than it,
        // OR if the current step is the very last step in the wizard.
        if (stepNumber < currentStep || currentStep === totalSteps) {
          stepClass += ' completed';
        } else if (stepNumber === currentStep) {
          stepClass += ' active';
        }

        return (
          <div key={label} className={stepClass}>
            {/* --- NEW, CORRECTED LOGIC FOR THE ICON --- */}
            {/* Show a checkmark if the step is completed. */}
            {stepClass.includes('completed') ? <CheckLg /> : stepNumber}
            <div className="step-label">{label}</div>
          </div>
        );
      })}
    </div>
  );
};