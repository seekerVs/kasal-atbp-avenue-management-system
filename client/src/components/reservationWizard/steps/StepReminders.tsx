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
        <h4 className="mb-3">Reservation Reminders</h4>
        <p>Welcome to the online reservation form for Kasal atbp. Avenue. Please read the following reminders before proceeding:</p>
        <ul>
          <li>
            This form is for making a <strong>reservation request</strong>. Your items are not officially booked until confirmed by our staff.
          </li>
          <li>
            A payment is required to secure the availability of your chosen items for your event date.
          </li>
          {/* --- THIS IS THE NEW POLICY POINT --- */}
          <li>
            Once a reservation is confirmed, it is considered final. We operate on a strict <strong>no-cancellation and no-refund</strong> policy. However, we do allow for the <strong>replacement</strong> of items, subject to availability.
          </li>
          <li>
            Please ensure all contact information provided is accurate so our team can reach you.
          </li>
        </ul>
        <p>
          At Kasal atbp. Avenue, we value your Data Privacy. By proceeding, you will be asked to consent to the collection of personal information as required by the Data Privacy Act of 2012.
        </p>
      </div>
      
      {/* This button is part of the step, not the wizard controls */}
      <div className="text-end mt-4">
        <Button onClick={() => setShowPrivacyModal(true)}>
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