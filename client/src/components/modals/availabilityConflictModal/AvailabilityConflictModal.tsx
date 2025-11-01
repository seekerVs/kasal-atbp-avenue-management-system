// client/src/components/modals/availabilityConflictModal/AvailabilityConflictModal.tsx

import React from 'react';
import { Modal, Button, ListGroup, Alert } from 'react-bootstrap';
import { ExclamationTriangleFill } from 'react-bootstrap-icons';

interface ConflictingItem {
  name: string;
  variation: string;
}

interface AvailabilityConflictModalProps {
  show: boolean;
  onHide: () => void;
  conflictingItems: ConflictingItem[];
}

export const AvailabilityConflictModal: React.FC<AvailabilityConflictModalProps> = ({
  show,
  onHide,
  conflictingItems = [],
}) => {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center">
          <ExclamationTriangleFill className="me-2 text-warning" />
          Some Items Are Now Unavailable
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="warning">
          While you were finalizing your request, the following items were booked by another customer. Please remove them from your cart to proceed.
        </Alert>
        <ListGroup variant="flush" className="mt-3">
          {conflictingItems.map((item, index) => (
            <ListGroup.Item key={index} className="d-flex justify-content-between align-items-start">
              <div className="ms-2 me-auto">
                <div className="fw-bold">{item.name}</div>
                <small className="text-muted">{item.variation}</small>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onHide}>
          Ok
        </Button>
      </Modal.Footer>
    </Modal>
  );
};