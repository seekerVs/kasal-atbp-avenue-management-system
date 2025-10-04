import React from 'react';
import { Modal, Button, ListGroup } from 'react-bootstrap';
import { ExclamationTriangleFill } from 'react-bootstrap-icons';

interface ConfirmationModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  title: string;
  warnings: string[];
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  show, 
  onHide, 
  onConfirm, 
  title, 
  warnings 
}) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center">
          <ExclamationTriangleFill className="me-2 text-warning" /> 
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>The following optional fields are empty. Are you sure you want to proceed?</p>
        <ListGroup variant="flush">
          {warnings.map((warning, index) => (
            <ListGroup.Item key={index} className="px-0 py-1 border-0 text-muted">
              - {warning}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Go Back & Edit
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Proceed Anyway
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmationModal;