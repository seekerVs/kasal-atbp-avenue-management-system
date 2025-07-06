import React from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
import { useNotification } from '../../contexts/NotificationContext';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <ToastContainer
      position="top-end"
      className="p-3"
      style={{ position: 'fixed', top: 0, right: 0, zIndex: 1100 }}
    >
      {notifications.map(({ id, message, type, title }) => (
        <Toast
          key={id}
          onClose={() => removeNotification(id)}
          show
          delay={5000}
          autohide
          bg={type}
          className="text-white"
        >
          <Toast.Header closeButton>
            <strong className="me-auto text-capitalize">
              {title ?? type}
            </strong>
          </Toast.Header>
          <Toast.Body role="alert" aria-live="assertive">
            {message}
          </Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
};

export default NotificationContainer;
