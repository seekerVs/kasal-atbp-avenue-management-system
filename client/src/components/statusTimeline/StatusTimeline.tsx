import React from 'react';
import { CheckCircleFill } from 'react-bootstrap-icons';
import './statusTimeline.css';

interface StatusTimelineProps {
  steps: string[];
  currentStatus: string;
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ steps, currentStatus }) => {
  const currentIndex = steps.findIndex(step => step === currentStatus);
  const totalSteps = steps.length;

  const progressWidth =
    currentIndex > 0 && totalSteps > 1
      ? (currentIndex / (totalSteps - 1)) * 100
      : 0;

  return (
    <div className="status-timeline">
      {steps.map((step, index) => {
        let statusClass = 'step';
        if (index < currentIndex) {
          statusClass += ' completed';
        } else if (index === currentIndex) {
          statusClass += ' active';
        }

        return (
          <div key={step} className={statusClass}>
            <div className="step-icon">
              {index <= currentIndex ? <CheckCircleFill /> : <div className="step-dot"></div>}
            </div>
            <div className="step-label">{step}</div>
          </div>
        );
      })}

      <div className="timeline-track"></div>
      <div className="timeline-progress" style={{ width: `${progressWidth-10}%` }}></div>
    </div>
  );
};