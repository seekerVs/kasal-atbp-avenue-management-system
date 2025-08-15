// client/src/components/modals/dataPrivacyModal/DataPrivacyModal.tsx

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
        
        {/* --- REVISED CONTENT STARTS HERE --- */}

        <p>
          At <strong>Kasal atbp. Avenue</strong>, we are committed to protecting your privacy in compliance with the Data Privacy Act of 2012 (RA 10173).
        </p>
        <p>
          By proceeding, you consent to the collection and processing of the personal information you provide. This data will be used for the following legitimate business purposes:
        </p>
        <ul>
          <li>
            <strong>Service Processing:</strong> To process and manage your requests.
          </li>
          <li>
            <strong>Communication:</strong> To contact you with confirmations, updates, and reminders regarding your request.
          </li>
          <li>
            <strong>Record Keeping:</strong> For internal administrative and documentation purposes.
          </li>
        </ul>
        <p>
          Your information will be stored securely and will not be shared with third parties, except as required by law. You have the right to access, correct, or request the deletion of your personal data in accordance with the law.
        </p>
        <p >
          By clicking "I Agree and Proceed", you acknowledge and consent to the collection and processing of your personal data for the purposes stated above.
        </p>

        {/* --- REVISED CONTENT ENDS HERE --- */}
        
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