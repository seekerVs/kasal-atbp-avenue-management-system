// client/src/components/modals/reservationSuccessModal/ReservationSuccessModal.tsx

import React from 'react';
import { Modal, Button, Badge } from 'react-bootstrap';
import { CheckCircleFill } from 'react-bootstrap-icons';
import { Reservation } from '../../../types';
// We no longer need the other imports like ListGroup, Reservation, etc.

// The props are now much simpler
interface ReservationSuccessModalProps {
  show: boolean;
  onHide: () => void;
  reservation: Reservation | null;
}

export const ReservationSuccessModal: React.FC<ReservationSuccessModalProps> = ({ show, onHide, reservation }) => {
  return (
    // The modal is now smaller and more focused
    <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false}>
            <Modal.Body className="p-4">
        <div className="text-center">
            <CheckCircleFill className="text-success mb-3" size={50} />
            <h4 className="mb-2">Request Submitted!</h4>
            <p className="text-muted mb-4">
              Your request is now pending review. Here's what to expect next:
            </p>
        </div>

        {/* --- PASTED AND MODIFIED "NEXT STEPS" LOGIC --- */}
        <div className="text-start bg-light p-3 rounded">
          <p className="small mb-2">
              <Badge pill bg="primary" className="me-2">1</Badge> 
              Our staff will now review your request and verify your payment details.
          </p>
          <p className="small mb-2">
              <Badge pill bg="primary" className="me-2">2</Badge> 
              Please check the status of your request from time to time via the <strong>Request Tracker</strong> page.
          </p>
          <p className="small mb-0">
              <Badge pill bg="primary" className="me-2">3</Badge> 
              For any urgent concerns, feel free to <strong>contact us</strong> directly with your Reservation ID.
          </p>
        </div>
      </Modal.Body>
      <Modal.Footer className="justify-content-center border-0">
        <Button variant="primary" onClick={onHide}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
};