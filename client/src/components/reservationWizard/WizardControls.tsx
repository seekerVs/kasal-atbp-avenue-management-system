import React from 'react';
import { Button, Spinner } from 'react-bootstrap';
import { ArrowLeft, ArrowRight } from 'react-bootstrap-icons';

interface WizardControlsProps {
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  isNextDisabled?: boolean;
  isSubmitting?: boolean;
}

export const WizardControls: React.FC<WizardControlsProps> = ({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  isNextDisabled = false,
  isSubmitting = false,
}) => {
  // Determine the text for the "Next" button. On the final review step, it should say "Submit".
  const nextButtonText = currentStep === totalSteps - 1 ? 'Submit' : 'Next';

  // The controls should not be visible on the final "Finish" screen.
  if (currentStep >= totalSteps) {
    return null;
  }

  return (
    <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
      {/* The "Back" button is only visible from Step 2 onwards. */}
      <div>
        {currentStep > 1 && (
          <Button variant="outline-secondary" onClick={onBack} disabled={isSubmitting}>
            <ArrowLeft className="me-2" />
            Back
          </Button>
        )}
      </div>

      {/* The "Next" or "Submit" button. */}
      <div>
        <Button onClick={onNext} disabled={isNextDisabled || isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner as="span" size="sm" className="me-2" />
              Submitting...
            </>
          ) : (
            <>
              {nextButtonText}
              <ArrowRight className="ms-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};