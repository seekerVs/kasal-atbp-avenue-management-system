import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { ExclamationTriangleFill } from 'react-bootstrap-icons';
import { useAlert } from '../../../contexts/AlertContext';

// Define the standard list of reasons
const CANCELLATION_REASONS = [
  "Customer Request",
  "Payment Not Received / Invalid Receipt",
  "Scheduling Conflict / Unavailable Staff",
  "Item/Stock Unavailability",
  "Other",
];

// Define the props the modal will accept
interface CancellationReasonModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: (reason: string) => void; // Callback with the final reason string
  title: string;
  itemType: string; // e.g., "reservation" or "rental"
  itemId: string;
}

export const CancellationReasonModal: React.FC<CancellationReasonModalProps> = ({
  show,
  onHide,
  onConfirm,
  title,
  itemType,
  itemId
}) => {
  const { addAlert } = useAlert();
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReasonText, setOtherReasonText] = useState('');

  // Reset state when the modal is opened
  useEffect(() => {
    if (show) {
      setSelectedReasons([]);
      setOtherReasonText('');
    }
  }, [show]);

  const handleReasonChange = (reason: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedReasons(prev => [...prev, reason]);
    } else {
      setSelectedReasons(prev => prev.filter(r => r !== reason));
      if (reason === "Other") {
        setOtherReasonText('');
      }
    }
  };

  const handleConfirmClick = () => {
    if (selectedReasons.length === 0) {
      addAlert('Please select at least one reason for cancellation.', 'warning');
      return;
    }
    if (selectedReasons.includes("Other") && !otherReasonText.trim()) {
      addAlert('Please specify a reason for "Other".', 'warning');
      return;
    }

    let finalReason = selectedReasons
      .filter(r => r !== "Other")
      .join(', ');

    if (selectedReasons.includes("Other")) {
      if (finalReason) {
        finalReason += ` - Other: ${otherReasonText.trim()}`;
      } else {
        finalReason = `Other: ${otherReasonText.trim()}`;
      }
    }
    
    onConfirm(finalReason);
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <ExclamationTriangleFill className="me-2 text-warning" />
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Please select the reason(s) for cancelling this {itemType}: <strong>{itemId}</strong>. This action cannot be undone.
        </p>
        <Form>
          {CANCELLATION_REASONS.map((reason) => (
            <Form.Check 
              key={reason}
              type="checkbox"
              id={`reason-${reason.replace(/\s+/g, '-')}-${itemId}`} // Create a unique ID
              label={reason}
              checked={selectedReasons.includes(reason)}
              onChange={(e) => handleReasonChange(reason, e.target.checked)}
            />
          ))}
          {selectedReasons.includes("Other") && (
            <Form.Control
              as="textarea"
              rows={2}
              className="mt-2 ms-4"
              style={{ width: 'calc(100% - 24px)'}}
              placeholder="Please specify the reason..."
              value={otherReasonText}
              onChange={(e) => setOtherReasonText(e.target.value)}
            />
          )}
        </Form>
        </Modal.Body>
        <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
            Back
        </Button>
        <Button variant="danger" onClick={handleConfirmClick}>
            Confirm Cancellation
        </Button>
        </Modal.Footer>
    </Modal>
  );
};