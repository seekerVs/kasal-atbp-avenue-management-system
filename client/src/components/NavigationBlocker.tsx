import React from 'react'; // <-- ADD THIS IMPORT
import { useState, useEffect, useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import { ExclamationTriangleFill } from 'react-bootstrap-icons';

// Define the props for our component.
interface NavigationBlockerProps {
  when: boolean;
}

/**
 * A component that uses React Router's useBlocker to prevent internal navigation
 * when there are unsaved changes, showing a custom Bootstrap modal for confirmation.
 *
 * @param {boolean} when - A boolean flag indicating if blocking should be active.
 */
// --- THIS IS THE CORRECTED LINE ---
// We now define it as a React.FC (Functional Component) which correctly types the props.
export const NavigationBlocker: React.FC<NavigationBlockerProps> = ({ when }) => {
  const blocker = useBlocker(when);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowModal(true);
    }
  }, [blocker]);

  const handleLeave = useCallback(() => {
    setShowModal(false);
    blocker.proceed?.(); 
  }, [blocker]);

  const handleStay = useCallback(() => {
    setShowModal(false);
    blocker.reset?.();
  }, [blocker]);

  return (
    <Modal show={showModal} onHide={handleStay} centered backdrop="static" keyboard={false}>
      <Modal.Header>
        <Modal.Title>
          <ExclamationTriangleFill className="me-2 text-warning" />
          Leave Page?
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        You have unsaved changes. Are you sure you want to leave? Your progress will be lost.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleStay}>
          Stay
        </Button>
        <Button onClick={handleLeave}>
          Leave
        </Button>
      </Modal.Footer>
    </Modal>
  );
};