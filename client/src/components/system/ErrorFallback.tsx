import React from 'react';
import { Container, Card, Button, Alert } from 'react-bootstrap';
import { ArrowCounterclockwise, ArrowLeft, ExclamationTriangleFill } from 'react-bootstrap-icons';
import { FallbackProps } from 'react-error-boundary';
// We no longer need useNavigate, so the import is removed.

export const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {

  // We replace the useNavigate hook with a simple handler function.
  const handleGoBack = () => {
    // This is the standard browser API to go to the previous page.
    // It does not depend on React Router.
    window.history.back();
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      <Card className="text-center shadow-lg border-danger" style={{ maxWidth: '500px' }}>
        <Card.Header as="h5" className="bg-danger text-white">
          <ExclamationTriangleFill className="me-2" />
          An Unexpected Error Occurred
        </Card.Header>
        <Card.Body className="p-4">
          <Card.Title>Something went wrong.</Card.Title>
          <Card.Text className="text-muted">
            We apologize for the inconvenience. A critical error has occurred in the application.
            Please try refreshing the page, or go back to the previous page.
          </Card.Text>
          <Alert variant="danger" className="text-start small mt-4">
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>
              {error.message}
            </pre>
          </Alert>
          <div className="d-flex justify-content-center gap-2 mt-4">
            <Button variant="secondary" onClick={handleGoBack}>
              <ArrowLeft className="me-2" />
              Go Back
            </Button>
            <Button variant="primary" onClick={resetErrorBoundary}>
              <ArrowCounterclockwise className="me-2" />
              Refresh Page
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};