import React from 'react';
import { Alert, Toast, ToastContainer } from 'react-bootstrap';
import { useNotification } from '../../contexts/NotificationContext';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    // This container will hold all notifications and is positioned at the top-right
    <ToastContainer
      position="top-end"
      className="p-3"
      style={{ zIndex: 1100, position: 'fixed' }} 
    >
      {notifications.map(({ id, message, type }) => (
        <Toast
          key={id}
          onClose={() => removeNotification(id)}
          show={true}
          delay={5000}
          autohide
          bg={type}
          className="text-white"
        >
          <Toast.Header closeButton={true}>
            <strong className="me-auto text-capitalize">{type}</strong>
          </Toast.Header>
          <Toast.Body>{message}</Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default NotificationContainer;