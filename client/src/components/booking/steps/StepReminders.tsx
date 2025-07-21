import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { DataPrivacyModal } from '../../modals/dataPrivacyModal/DataPrivacyModal';

interface StepRemindersProps {
  onNext: () => void;
}

export const StepReminders: React.FC<StepRemindersProps> = ({ onNext }) => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleProceed = () => {
    setShowPrivacyModal(false);
    onNext();
  };

  return (
    <>
      <div>
        <h4 className="mb-3">REMINDERS</h4>
        <p>Welcome to the online booking form for Kasal atbp. Avenue. Please read the following reminders before proceeding:</p>
        <ul>
          <li>All bookings are tentative until confirmed by our staff via phone call or email.</li>
          <li>A down payment is required to confirm and secure your reservation.</li>
          <li>Please ensure all contact information provided is accurate.</li>
        </ul>
        <p>
          At Kasal atbp. Avenue, we value your Data Privacy. By proceeding, you will be asked to consent to the collection of personal information as required by the Data Privacy Act of 2012.
        </p>
      </div>
      
      {/* This button is part of the step, not the wizard controls */}
      <div className="text-end mt-4">
        <Button variant="danger" onClick={() => setShowPrivacyModal(true)}>
          Proceed →
        </Button>
      </div>

      <DataPrivacyModal 
        show={showPrivacyModal}
        onHide={() => setShowPrivacyModal(false)}
        onProceed={handleProceed}
      />
    </>
  );
};