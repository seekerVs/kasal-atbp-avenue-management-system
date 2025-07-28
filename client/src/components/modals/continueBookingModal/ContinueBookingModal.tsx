// client/src/components/modals/continueBookingModal/ContinueBookingModal.tsx

import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { ArrowCounterclockwise, ArrowRight } from 'react-bootstrap-icons';

interface ContinueBookingModalProps {
  show: boolean;
  onContinue: () => void;
  onStartNew: () => void;
}

export const ContinueBookingModal: React.FC<ContinueBookingModalProps> = ({ show, onContinue, onStartNew }) => {
  return (
    // backdrop="static" prevents closing by clicking outside
    <Modal show={show} onHide={() => {}} centered backdrop="static" keyboard={false}>
      <Modal.Header>
        <Modal.Title>Booking in Progress</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>You have items in your current booking selection.</p>
        <p>Would you like to continue with your existing selections or start a new booking?</p>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="outline-danger" onClick={onStartNew}>
          <ArrowCounterclockwise className="me-2" />
          Start New Booking
        </Button>
        <Button variant="primary" onClick={onContinue}>
          Continue with Existing
          <ArrowRight className="ms-2" />
        </Button>
      </Modal.Footer>
    </Modal>
  );
};