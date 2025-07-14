import React from 'react';
import { Alert } from 'react-bootstrap';
import { useAlert } from '../../contexts/AlertContext';
import './alertContainer.css'; // We will create this CSS file next

const AlertContainer = () => {
  const { alerts, removeAlert } = useAlert();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="alert-container-wrapper">
      {alerts.map(({ id, message, type }) => (
        <Alert
          key={id}
          variant={type}
          onClose={() => removeAlert(id)}
          dismissible
          className="shadow-lg"
        >
          {message}
        </Alert>
      ))}
    </div>
  );
};

export default AlertContainer;