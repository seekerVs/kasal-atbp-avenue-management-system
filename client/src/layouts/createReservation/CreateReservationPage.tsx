// client/src/layouts/createReservation/CreateReservationPage.tsx

import { useState, useEffect, useRef } from 'react';
import { Container, Card, Row, Col, Modal, Button, Spinner } from 'react-bootstrap';
import { format, addDays } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { Reservation, FormErrors, Package, PackageReservation, UnavailabilityRecord, ShopSettings } from '../../types';
import api, { uploadFile } from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';

import { CustomerAndDateInfo } from '../../components/reservationWizard/CustomerAndDateInfo';
import { ReservationManager } from '../../components/reservationWizard/ReservationManager';
import { StepReminders } from '../../components/reservationWizard/steps/StepReminders';
import { StepPayment } from '../../components/reservationWizard/steps/StepPayment';
import { WizardControls } from '../../components/reservationWizard/WizardControls';
import { BookingProgressBar } from '../../components/reservationWizard/progressBar/BookingProgressBar';
import { StepFinish } from '../../components/reservationWizard/steps/StepFinish';
import { calculateItemDeposit, calculatePackageDeposit } from '../../utils/financials';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { NavigationBlocker } from '../../components/NavigationBlocker';
import { PackageConfigurationData } from '../../components/modals/packageConfigurationModal/PackageConfigurationModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, ExclamationTriangleFill } from 'react-bootstrap-icons';
import { ReservationSummary } from '../../components/reservationSummary/ReservationSummary';
import { AvailabilityConflictModal } from '../../components/modals/availabilityConflictModal/AvailabilityConflictModal';

// The initial state for reserveDate is now a FORMATTED STRING ("YYYY-MM-DD").
// This is the definitive fix to prevent the RangeError.
const getInitialReservationState = (): Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status' | 'reserveDate'> & { reserveDate: string } => {
  const today = new Date();
  return {
    customerInfo: { name: '', email: '', phoneNumber: '', address: { province: 'Camarines Norte', city: '', barangay: '', street: '' } },
    reserveDate: format(addDays(today, 7), 'yyyy-MM-dd'),
    financials: {},
    itemReservations: [],
    packageReservations: [],
    packageAppointmentDate: null,
    packageAppointmentBlock: null, 
  };
};

const WIZARD_STEPS = ['Reminders', 'Information', 'Reserve', 'Payment', 'Finish'];

function CreateReservationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addAlert } = useAlert();

  const [currentStep, setCurrentStep] = useState(1);
  const [reservation, setReservation] = useState(getInitialReservationState);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
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
  const [showDateChangeWarning, setShowDateChangeWarning] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<Date | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingItems, setConflictingItems] = useState([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [settingsResponse, unavailabilityResponse] = await Promise.all([
          api.get('/settings/public'),
          api.get('/unavailability')
        ]);
        
        setShopSettings(settingsResponse.data);

        const dates = unavailabilityResponse.data.map((rec: UnavailabilityRecord) => new Date(rec.date));
        setUnavailableDates(dates);

      } catch (err) {
        console.error("Failed to fetch initial page data.", err);
        addAlert("Could not load all page data. Some features might be unavailable.", "warning");
      }
    };
    fetchInitialData();
  }, [addAlert]);

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
        startStep = 2;
        sessionStorage.removeItem('pendingReservationItem');
      } catch (error) {
        console.error("Failed to parse pre-selected item:", error);
        sessionStorage.removeItem('pendingReservationItem');
      }
    }

    if (location.state?.targetDate) {
      // Override the default date with the one from the ProductViewer
      const passedDate = new Date(location.state.targetDate);
      initialState.reserveDate = format(passedDate, 'yyyy-MM-dd');
    }

    setReservation(initialState);
    setCurrentStep(startStep);
    initialReservationStateRef.current = JSON.stringify(initialState);
    initialDataLoaded.current = true;
    
  // The dependency array still needs to be empty to run only once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    // Check if the modal has just become visible AND we have the data needed for the PDF
    if (showSuccessModal && submittedReservation) {
      // We use a small timeout to ensure the modal and its content (the summary)
      // have fully rendered in the DOM before we try to capture it.
      const timer = setTimeout(() => {
        handleDownloadPdf();
      }, 500); // 500ms delay

      // Cleanup function to clear the timer if the component unmounts
      return () => clearTimeout(timer);
    }
  // We want this effect to run ONLY when showSuccessModal changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSuccessModal]);

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

  const handleBookAnother = () => {
    const resetState = getInitialReservationState();
    setReservation(resetState);
    setErrors({});
    setSubmittedReservation(null);
    setCurrentStep(1); // Go back to the first step
    initialReservationStateRef.current = JSON.stringify(resetState);
  };

  const handleViewInvoice = () => {
    if (submittedReservation) {
      setShowSuccessModal(true);
    } else {
      addAlert("No submission details available to show.", "warning");
    }
  };
    
  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = { customerInfo: { address: {} } };
    let isValid = true;

    if (step === 2) {
      const { customerInfo, reserveDate } = reservation;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!customerInfo.name.trim()) newErrors.customerInfo.name = 'Full name is required.';
      if (!/^09\d{9}$/.test(customerInfo.phoneNumber)) newErrors.customerInfo.phoneNumber = 'Phone number must be a valid 11-digit number starting with 09.';

      if (!customerInfo.email || !customerInfo.email.trim()) {
        newErrors.customerInfo.email = 'Email address is required.';
      } else if (!emailRegex.test(customerInfo.email)) {
        newErrors.customerInfo.email = 'Please enter a valid email format.';
      }
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
        !newErrors.customerInfo.email && // <-- ADD THIS CHECK
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
    setErrors({}); // Clear old errors before submitting

    try {
      let receiptImageUrl = '';
      if (receiptFile) {
        addAlert('Uploading receipt...', 'info');
        receiptImageUrl = await uploadFile(receiptFile);
      }
      
      const finalReservationPayload = {
        customerInfo: reservation.customerInfo,
        reserveDate: reservation.reserveDate,
        itemReservations: reservation.itemReservations,
        packageReservations: reservation.packageReservations,
        packageAppointmentDate: reservation.packageAppointmentDate,
        packageAppointmentBlock: reservation.packageAppointmentBlock,
        financials: {
          // Only send the payments array. The backend will calculate everything else.
          payments: reservation.financials.payments?.map(p => ({
            ...p,
            receiptImageUrl: receiptImageUrl || undefined
          }))
        }
      };

      const response = await api.post('/reservations', finalReservationPayload);
      setSubmittedReservation(response.data); 
      setCurrentStep(5);
      setShowSuccessModal(true);

    } catch (err: any) {
      // --- THIS IS THE NEW ERROR HANDLING LOGIC ---
      if (err.response && err.response.status === 409) {
        // This is our specific availability conflict error
        setConflictingItems(err.response.data.conflictingItems || []);
        setShowConflictModal(true);
        setCurrentStep(3); // Navigate back to Step 3 (the ReservationManager)
        addAlert('Some items are no longer available.', 'danger');
      } else {
        // This is for all other generic errors (e.g., 400, 500)
        addAlert(err.response?.data?.message || 'Failed to submit reservation.', 'danger');
      }
      // --- END OF NEW LOGIC ---
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    const input = summaryRef.current;
    if (!input) {
      addAlert('Could not generate PDF, content not found.', 'danger');
      return;
    }

    setIsDownloading(true);

    html2canvas(input, { scale: 2 })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pdfWidth - 20;
        const canvasAspectRatio = canvas.width / canvas.height;
        const contentHeight = contentWidth / canvasAspectRatio;

        pdf.addImage(imgData, 'PNG', 10, 10, contentWidth, contentHeight);
        pdf.save(`reservation-invoice-${submittedReservation?._id}.pdf`);
      })
      .catch(() => {
        addAlert('Could not generate PDF. Please try again.', 'danger');
      })
      .finally(() => {
        setIsDownloading(false);
      });
  };

  const handleSaveConfiguration = (config: PackageConfigurationData, pkg: Package, motifId: string, editingPackageId: string | null) => {
    const selectedMotif = pkg.colorMotifs.find(m => m._id === motifId);

    setReservation(prev => {
      const updatedReservations = [...prev.packageReservations];

      if (editingPackageId) {
        const indexToUpdate = updatedReservations.findIndex(p => p.packageReservationId === editingPackageId);
        if (indexToUpdate > -1) {
          updatedReservations[indexToUpdate] = {
            ...updatedReservations[indexToUpdate],
            fulfillmentPreview: config.packageReservation,
          };
        }
      } else {
        const newPackageReservation: PackageReservation = {
          packageReservationId: `pkg_${Date.now()}`,
          packageId: pkg._id,
          packageName: pkg.name,
          price: pkg.price,
          motifHex: selectedMotif?.motifHex,
          fulfillmentPreview: config.packageReservation,
          imageUrl: pkg.imageUrls?.[0],
        };
        updatedReservations.push(newPackageReservation);
      }
      
      let newAppointmentDate = prev.packageAppointmentDate;
      let newAppointmentBlock = prev.packageAppointmentBlock;
      if (config.packageAppointment) {
        newAppointmentDate = config.packageAppointment.date;
        newAppointmentBlock = config.packageAppointment.block === '' ? null : config.packageAppointment.block;
      }

      return {
        ...prev,
        packageReservations: updatedReservations,
        packageAppointmentDate: newAppointmentDate,
        packageAppointmentBlock: newAppointmentBlock,
      };
    });
  };

  const handleDateChangeRequest = (newDate: Date | null) => {
    if (!newDate) {
      // Handle case where the date is cleared
      setReservation(prev => ({ ...prev, reserveDate: '' }));
      return;
    }

    const newDateString = format(newDate, 'yyyy-MM-dd');
    const hasItems = reservation.itemReservations.length > 0 || reservation.packageReservations.length > 0;

    // Check if the date is different AND there are items in the cart
    if (newDateString !== reservation.reserveDate && hasItems) {
      setPendingDateChange(newDate);
      setShowDateChangeWarning(true);
    } else {
      // If no items in cart or date is the same, update directly
      setReservation(prev => ({ ...prev, reserveDate: newDateString }));
    }
  };

  const handleConfirmDateChange = () => {
    if (!pendingDateChange) return;

    const newDateString = format(pendingDateChange, 'yyyy-MM-dd');

    setReservation(prev => ({
      ...prev,
      reserveDate: newDateString,
      // --- THIS IS THE CRITICAL PART ---
      // Resetting the items and packages
      itemReservations: [],
      packageReservations: [],
    }));

    // Clean up state
    setShowDateChangeWarning(false);
    setPendingDateChange(null);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <StepReminders onNext={() => setCurrentStep(2)} />;
      case 2: return <CustomerAndDateInfo reservation={reservation as any} onDateChange={handleDateChangeRequest} setReservation={setReservation as any} errors={errors} unavailableDates={unavailableDates} />;
      case 3: return <ReservationManager reservation={reservation as any} setReservation={setReservation as any} addAlert={addAlert} onSavePackageConfig={handleSaveConfiguration} reserveDate={reservation.reserveDate} />;
      case 4: return <StepPayment reservation={reservation as any} setReservation={setReservation as any} setReceiptFile={setReceiptFile} subtotal={subtotal} requiredDeposit={requiredDeposit} grandTotal={grandTotal} errors={errors} gcashName={shopSettings?.gcashName} gcashNumber={shopSettings?.gcashNumber}/>;
      case 5: return <StepFinish reservation={submittedReservation} onBookAnother={handleBookAnother} onViewInvoice={handleViewInvoice} />;
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
      
      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} size="lg" centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Reservation Summary</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* The ReservationSummary is now directly inside the modal */}
          {/* It has a wrapper to be scrollable and look clean */}
          <div style={{ maxHeight: '70vh', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.375rem' }}>
            <ReservationSummary ref={summaryRef} reservation={submittedReservation} shopSettings={shopSettings} />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSuccessModal(false)}>
            Close
          </Button>
          <Button variant="success" onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? <Spinner as="span" size="sm" className="me-1" /> : <Download className="me-1" />}
            Download
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDateChangeWarning} onHide={() => setShowDateChangeWarning(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <ExclamationTriangleFill className="me-2 text-warning" />
            Change Reservation Date?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Changing the reservation date will clear all items and packages from your current selection. This is to ensure item availability is re-verified for the new date.</p>
          <p className="mb-0">Are you sure you want to proceed?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDateChangeWarning(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirmDateChange}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
      <AvailabilityConflictModal
        show={showConflictModal}
        onHide={() => setShowConflictModal(false)}
        conflictingItems={conflictingItems}
      />
    </>
  );
}

export default CreateReservationPage;