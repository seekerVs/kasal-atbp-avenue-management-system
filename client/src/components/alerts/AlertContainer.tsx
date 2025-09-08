import React from 'react';
import { useAlert, AlertType } from '../../contexts/AlertContext';
import { CheckCircleFill, ExclamationTriangleFill, InfoCircleFill, X } from 'react-bootstrap-icons';
import './alertContainer.css';

interface SingleAlertProps {
  id: string;
  message: string | string[];
  type: AlertType;
  isPaused: boolean;
  remainingTime: number;
  onRemove: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
}

// A helper component for a single alert
const SingleAlert: React.FC<SingleAlertProps> = ({ 
  id, 
  message, 
  type, 
  isPaused, 
  remainingTime, 
  onRemove, 
  onPause, 
  onResume 
}) => {
  const ICONS: { [key in AlertType]: React.ReactNode } = {
    success: <CheckCircleFill />,
    danger: <ExclamationTriangleFill />,
    warning: <ExclamationTriangleFill />,
    info: <InfoCircleFill />,
  };

  const TITLES: { [key in AlertType]: string } = {
    success: 'Success',
    danger: 'Error',
    warning: 'Warning',
    info: 'Information',
  };

  return (
    <div
      className={`custom-alert alert-${type} lh-1`}
      onMouseEnter={() => onPause(id)}
      onMouseLeave={() => onResume(id)}
    >
      <div className="alert-icon">{ICONS[type]}</div>
      <div className="alert-content">
        <div className="alert-title">{TITLES[type]}</div>
        <div className="alert-message">
          {Array.isArray(message) ? (
            <ul className="mb-0 ps-3">
              {message.map((msg, index) => <li key={index}>{msg}</li>)}
            </ul>
          ) : (
            message
          )}
        </div>
      </div>
      <button className="alert-close-btn" onClick={() => onRemove(id)}><X /></button>
      <div 
        className={`alert-progress-bar ${isPaused ? 'paused' : ''}`}
        style={{ animationDuration: `${remainingTime}ms` }}
      />
    </div>
  );
};


const AlertContainer = () => {
  const { alerts, removeAlert, pauseAlertTimer, resumeAlertTimer } = useAlert();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="alert-container-wrapper">
      {alerts.map(({ id, message, type, isPaused, remainingTime }) => (
        <SingleAlert
          key={id}
          id={id}
          message={message}
          type={type}
          isPaused={isPaused}
          remainingTime={remainingTime}
          onRemove={removeAlert}
          onPause={pauseAlertTimer}
          onResume={resumeAlertTimer}
        />
      ))}
    </div>
  );
};

export default AlertContainer;