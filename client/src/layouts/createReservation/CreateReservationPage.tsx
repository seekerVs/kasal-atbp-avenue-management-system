// client/src/layouts/createReservation/CreateReservationPage.tsx

import { useState, useEffect, useRef } from 'react';
import { Container, Card, Row, Col } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, addDays } from 'date-fns';

import { Reservation, FormErrors, ItemReservation, Package, PackageReservation, UnavailabilityRecord } from '../../types';
import CustomFooter from '../../components/customFooter/CustomFooter';
import api, { uploadFile } from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';

import { CustomerAndDateInfo } from '../../components/reservationWizard/CustomerAndDateInfo';
import { ReservationManager } from '../../components/reservationWizard/ReservationManager';
import { StepReminders } from '../../components/reservationWizard/steps/StepReminders';
import { StepPayment } from '../../components/reservationWizard/steps/StepPayment';
import { WizardControls } from '../../components/reservationWizard/WizardControls';
import { BookingProgressBar } from '../../components/reservationWizard/progressBar/BookingProgressBar';
import { ReservationSuccessModal } from '../../components/reservationWizard/reservationSuccessModal/ReservationSuccessModal';
import { StepFinish } from '../../components/reservationWizard/steps/StepFinish';
import { calculateItemDeposit, calculatePackageDeposit } from '../../utils/financials';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { NavigationBlocker } from '../../components/NavigationBlocker';

// The initial state for reserveDate is now a FORMATTED STRING ("YYYY-MM-DD").
// This is the definitive fix to prevent the RangeError.
const getInitialReservationState = (): Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status' | 'reserveDate'> & { reserveDate: string } => {
  const today = new Date();
  return {
    customerInfo: { name: '', email: '', phoneNumber: '', address: { province: 'Camarines Norte', city: '', barangay: '', street: '' } },
    reserveDate: format(addDays(today, 7), 'yyyy-MM-dd'), // Stored as a string
    financials: {},
    itemReservations: [],
    packageReservations: [],
  };
};

const WIZARD_STEPS = ['Reminders', 'Information', 'Reserve', 'Payment', 'Finish'];

function CreateReservationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addAlert } = useAlert();

  const [currentStep, setCurrentStep] = useState(1);
  const [reservation, setReservation] = useState(getInitialReservationState);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReservation, setSubmittedReservation] = useState<Reservation | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [subtotal, setSubtotal] = useState(0);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);

  const [requiredDeposit, setRequiredDeposit] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const initialReservationStateRef = useRef<string | null>(null);
  const initialDataLoaded = useRef(false);

  useEffect(() => {
    const fetchUnavailability = async () => {
      try {
        const response = await api.get('/unavailability');
        // The API returns strings, but the DatePicker needs Date objects.
        const dates = response.data.map((rec: UnavailabilityRecord) => new Date(rec.date));
        setUnavailableDates(dates);
      } catch (err) {
        console.error("Failed to fetch unavailable dates for the reservation calendar.", err);
        // Silently fail is okay here, as the primary function can still proceed.
      }
    };
    fetchUnavailability();
  }, []);

  useEffect(() => {
    if (initialDataLoaded.current) return;

    const pendingItemJSON = sessionStorage.getItem('pendingReservationItem');
    let initialState = getInitialReservationState();
    let startStep = 1;

    if (pendingItemJSON) {
      try {
        const payload = JSON.parse(pendingItemJSON);
        if (payload.type === 'item') {
          initialState.itemReservations = [payload.data];
        } else if (payload.type === 'package') {
          initialState.packageReservations = [payload.data];
        }
        startStep = 2; // Set the starting step
        sessionStorage.removeItem('pendingReservationItem');
      } catch (error) {
        console.error("Failed to parse pre-selected item:", error);
        sessionStorage.removeItem('pendingReservationItem');
      }
    }

    // --- 3. STORE THE FINAL INITIAL STATE IN THE REF ---
    setReservation(initialState);
    setCurrentStep(startStep);
    initialReservationStateRef.current = JSON.stringify(initialState);
    initialDataLoaded.current = true;

  }, []);

  useEffect(() => {
    // --- STEP 1: Calculate the primary totals from the items in the reservation ---
    const newSubtotal = 
      reservation.itemReservations.reduce((sum, item) => sum + item.price * item.quantity, 0) + 
      reservation.packageReservations.reduce((sum, pkg) => sum + pkg.price, 0);

    const itemDeposits = reservation.itemReservations.reduce((sum, item) => sum + calculateItemDeposit(item), 0);
    // Calculate total package deposit by multiplying the fixed amount by the number of packages.
    const packageDeposits = reservation.packageReservations.length * calculatePackageDeposit(); 
    
    const newRequiredDeposit = itemDeposits + packageDeposits;

    const newGrandTotal = newSubtotal + newRequiredDeposit;

    // --- STEP 2: Update all financial state variables at once ---
    setSubtotal(newSubtotal);
    setRequiredDeposit(newRequiredDeposit); // <-- THE CRITICAL FIX
    setGrandTotal(newGrandTotal);

    // --- STEP 3: Update the default payment amount based on the new grand total ---
    if (newGrandTotal > 0) {
      const downPaymentAmount = newGrandTotal * 0.5;
      const currentPayment = reservation.financials.payments?.[0];
      
      // Only update if it's the initial setup or the amount needs recalculating
      if (!currentPayment || currentPayment.amount !== downPaymentAmount) {
        setReservation(prev => ({ 
          ...prev, 
          financials: { 
            ...prev.financials, 
            payments: [{ 
              amount: downPaymentAmount, 
              date: new Date(), 
              referenceNumber: currentPayment?.referenceNumber || '' 
            }] 
          } 
        }));
      }
    } else {
      // If total is zero, clear payments
      setReservation(prev => ({...prev, financials: { ...prev.financials, payments: [] }}));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservation.itemReservations, reservation.packageReservations]);

  const isDirty = initialReservationStateRef.current !== null && 
                  JSON.stringify(reservation) !== initialReservationStateRef.current;
  
  // Only activate the warning on the steps where a user is inputting data.
  const shouldWarnOnLeave = isDirty && currentStep >= 2 && currentStep <= 4;
  
  // Call the hook with our calculated boolean.
  useUnsavedChangesWarning(shouldWarnOnLeave);

  const handleBack = () => {
    // Check if we are currently on the Payment step (Step 4)
    if (currentStep === 4) {
      // If so, reset the payment details before going back.
      setReservation(prev => {
        // Recalculate the default 50% down payment based on the current grandTotal
        const newDownPaymentAmount = grandTotal * 0.5;
        
        return {
          ...prev,
          financials: {
            ...prev.financials,
            payments: [{ // Create a new payment object
              amount: newDownPaymentAmount,
              date: new Date(),
              referenceNumber: '' // Clear the reference number
            }]
          }
        };
      });
    }

    // This part runs for all "Back" clicks
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      // If on the Payment step (now the last step before Finish), submit.
      if (currentStep === 4) { 
        handleSubmit();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };
  
  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = { customerInfo: { address: {} } };
    let isValid = true;

    if (step === 2) {
      const { customerInfo, reserveDate } = reservation;
      if (!customerInfo.name.trim()) newErrors.customerInfo.name = 'Full name is required.';
      if (!/^09\d{9}$/.test(customerInfo.phoneNumber)) newErrors.customerInfo.phoneNumber = 'Phone number must be a valid 11-digit number starting with 09.';
      if (!customerInfo.address.province) newErrors.customerInfo.address.province = 'Province is required.';
      if (!customerInfo.address.city) newErrors.customerInfo.address.city = 'City/Municipality is required.';
      if (!customerInfo.address.barangay) newErrors.customerInfo.address.barangay = 'Barangay is required.';
      if (!customerInfo.address.street.trim()) newErrors.customerInfo.address.street = 'Street address is required.';
      
      // Validation now checks for a non-empty string
      if (!reserveDate.trim()) {
        (newErrors as any).reserveDate = 'A reservation date is required.';
      }

      isValid = 
        Object.keys(newErrors.customerInfo).length <= 1 && 
        Object.keys(newErrors.customerInfo.address).length === 0 && 
        !(newErrors as any).reserveDate;
    }
    
    if (step === 3) {
      if (reservation.itemReservations.length === 0 && reservation.packageReservations.length === 0) {
        addAlert('At least one item or package must be added to the reservation.', 'warning');
        isValid = false;
      }
    }
    
    if (step === 4) {
      const payment = reservation.financials.payments?.[0];
      if (subtotal > 0 && (!payment || !payment.referenceNumber?.trim())) {
        addAlert('A payment reference number is required.', 'warning');
        // --- ADD THIS LINE to set a specific error for the input field ---
        newErrors.paymentReference = 'A GCash Reference Number is required.';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let receiptImageUrl = '';
      // 1. Check if a receipt file has been staged for upload
      if (receiptFile) {
        // 2. Upload the file first and wait for the URL
        addAlert('Uploading receipt...', 'info');
        receiptImageUrl = await uploadFile(receiptFile);
      }
      
      // 3. Create a final payload, adding the new URL to the payment details
      const finalReservationPayload = {
        ...reservation,
        financials: {
          ...reservation.financials,
          payments: reservation.financials.payments?.map(p => ({
            ...p,
            receiptImageUrl: receiptImageUrl || undefined // Add URL, or undefined if empty
          }))
        }
      };

      // 4. Send the final, complete payload to the server
      const response = await api.post('/reservations', finalReservationPayload);
      setSubmittedReservation(response.data); 
      setCurrentStep(prev => prev + 1);

    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to submit reservation.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <StepReminders onNext={() => setCurrentStep(2)} />;
      case 2: return <CustomerAndDateInfo reservation={reservation as any} setReservation={setReservation as any} errors={errors} unavailableDates={unavailableDates} />;
      case 3: return <ReservationManager reservation={reservation as any} setReservation={setReservation as any} addAlert={addAlert} />;
      case 4: return <StepPayment reservation={reservation as any} setReservation={setReservation as any} setReceiptFile={setReceiptFile} subtotal={subtotal} requiredDeposit={requiredDeposit} grandTotal={grandTotal} errors={errors}/>;
      case 5: return <StepFinish reservation={submittedReservation} />;
      default: return null;
    }
  };

    return (
    <>
      <NavigationBlocker when={shouldWarnOnLeave}/>
        <Container fluid className="py-4">
          <Row className="justify-content-center">
            <Col lg={10} xl={8}>
              <Card className="shadow-sm">
                <Card.Header as="h2" className="text-center border-0 bg-transparent pt-4">
                  {currentStep < 5 ? 'Create a New Reservation' : 'Reservation Details'}
                </Card.Header>
                <Card.Body className="p-4 p-md-5">
                  {/* --- THIS IS THE MAIN CHANGE --- */}
                  {/* The progress bar is now always visible throughout the wizard */}
                  <BookingProgressBar currentStep={currentStep} steps={WIZARD_STEPS} />
        
                  <div className="mt-5">
                    {renderStepContent()}
                  </div>
                  {/* --- THIS CONDITION IS ALSO UPDATED --- */}
                  {/* The wizard controls are shown on steps 2, 3, and 4, but NOT on the final step 5 */}
                  {currentStep > 1 && currentStep < 5 && (
                    <WizardControls
                      currentStep={currentStep} totalSteps={WIZARD_STEPS.length}
                      onBack={handleBack} onNext={handleNext} isSubmitting={isSubmitting}
                    />
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      
      <ReservationSuccessModal
        show={showSuccessModal}
        onHide={() => setShowSuccessModal(false)}
        reservation={submittedReservation}
      />

      <footer className="bg-white text-dark py-3 border-top"><CustomFooter /></footer>
    </>
  );
}

export default CreateReservationPage;