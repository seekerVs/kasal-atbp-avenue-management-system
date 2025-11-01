// client/src/components/reservationWizard/steps/StepFinish.tsx

import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import { CheckCircleFill } from 'react-bootstrap-icons';
import { Reservation } from '../../../types';

interface StepFinishProps {
  reservation: Reservation | null;
  onBookAnother: () => void;
  onViewInvoice: () => void;
}

export const StepFinish: React.FC<StepFinishProps> = ({ reservation, onBookAnother, onViewInvoice }) => {
  
  if (!reservation) {
    return <div className="text-center"><p className="text-muted">Loading final details...</p></div>;
  }
  
  return (
    <div className="text-center p-3">
      <CheckCircleFill className="text-success mb-3" size={50} />
      <h3 className="mb-2">Reservation Request Submitted!</h3>
      <p className="text-muted mb-4">
          Your request has been processed. A detailed summary has been downloaded for your records.
      </p>
      <div className="d-inline-block p-3 border rounded mb-4">
        <p className="text-muted small mb-0" style={{ letterSpacing: '1px' }}>YOUR RESERVATION ID</p>
        <p className="h4 fw-bold text-danger mb-0">{reservation._id}</p>
      </div>
      <div className="text-start bg-light p-3 rounded small">
        <p className="mb-2">
            <Badge pill bg="primary" className="me-2">1</Badge> 
            Please check the status of your request using the <strong>Request Tracker</strong> page.
        </p>
        <p className="mb-0">
            <Badge pill bg="primary" className="me-2">2</Badge> 
            For any urgent concerns, feel free to <strong>contact us</strong> with your Reservation ID.
        </p>
      </div>
      <div className="d-flex justify-content-center gap-2 mt-4">
          <Button variant="primary" onClick={onBookAnother}>Book Another Reservation</Button>
          <Button variant="outline-success" onClick={onViewInvoice}>View Summary</Button>
      </div>
    </div>
  );
};