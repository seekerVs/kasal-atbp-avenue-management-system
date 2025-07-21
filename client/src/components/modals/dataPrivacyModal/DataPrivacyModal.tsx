import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { ShieldCheck } from 'react-bootstrap-icons';

interface DataPrivacyModalProps {
  show: boolean;
  onHide: () => void;
  onProceed: () => void;
}

export const DataPrivacyModal: React.FC<DataPrivacyModalProps> = ({ show, onHide, onProceed }) => {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <ShieldCheck className="me-2 text-primary" />
          Data Privacy Notice
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        <p>
          At <strong>Kasal atbp. Avenue</strong>, we are committed to protecting your privacy in compliance with Republic Act No. 10173, also known as the Data Privacy Act of 2012.
        </p>
        <p>
          By proceeding with this booking, you agree to the collection, use, and processing of the personal information you provide. The information collected, including your name, email address, contact number, and address, will be used for the following purposes:
        </p>
        <ul>
          <li>To process and manage your booking and rental requests.</li>
          <li>To communicate with you regarding your booking, including confirmations, updates, and reminders.</li>
          <li>For contact tracing purposes, if required by law or local government regulations.</li>
          <li>To maintain a record of our clients for internal administrative purposes.</li>
        </ul>
        <p>
          Your data will be stored securely and will not be shared with third parties without your explicit consent, unless required by law. You have the right to access, correct, and request the deletion of your personal data.
        </p>
        <p>
          By clicking "I Agree & Proceed," you acknowledge that you have read, understood, and consented to the terms of this Data Privacy Notice.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onProceed}>
          I Agree & Proceed
        </Button>
      </Modal.Footer>
    </Modal>
  );
};