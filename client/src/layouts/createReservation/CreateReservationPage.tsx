// client/src/layouts/createReservation/CreateReservationPage.tsx

import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Row, Col, Spinner } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { format, addDays } from 'date-fns';
import { CheckCircleFill } from 'react-bootstrap-icons';

import { Reservation, FormErrors, ItemReservation, Package, PackageReservation } from '../../types';
import CustomFooter from '../../components/customFooter/CustomFooter';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';

// WIZARD STRUCTURAL COMPONENTS
import { BookingProgressBar } from '../../components/booking/progressBar/BookingProgressBar';
import { WizardControls } from '../../components/booking/WizardControls';

// WIZARD STEP COMPONENTS
import { StepReminders } from '../../components/booking/steps/StepReminders';
import { CustomerAndDateInfo } from '../../components/reservationWizard/CustomerAndDateInfo';
import { ReservationManager } from '../../components/reservationWizard/ReservationManager';
import { StepPayment } from '../../components/booking/steps/StepPayment';
import { StepReview } from '../../components/booking/steps/StepReview';


const getInitialReservationState = (): Omit<Reservation, '_id' | 'createdAt' | 'updatedAt' | 'status'> => {
  const today = new Date();
  return {
    customerInfo: { name: '', email: '', phoneNumber: '', address: { province: 'Camarines Norte', city: '', barangay: '', street: '' } },
    eventDate: addDays(today, 7),
    reserveStartDate: addDays(today, 4),
    reserveEndDate: addDays(today, 9),
    financials: {},
    itemReservations: [],
    packageReservations: [],
  };
};

const WIZARD_STEPS = ['Reminders', 'Information', 'Reserve', 'Payment', 'Review', 'Finish'];

function CreateReservationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addAlert } = useAlert();

  const [currentStep, setCurrentStep] = useState(1);
  const [reservation, setReservation] = useState(getInitialReservationState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    // Check for a pre-selected package from navigation state
    const preselectedPackage = location.state?.preselectedPackage as Package | undefined;
    if (preselectedPackage) {
      const newPackageReservation: PackageReservation = {
        packageReservationId: `pkg_${Date.now()}`,
        packageId: preselectedPackage._id,
        packageName: preselectedPackage.name,
        price: preselectedPackage.price,
        // The motif name is now also coming from the preselectedPackage state
        motifName: (location.state as any)?.preselectedPackage?.motifName,
        
        // Use flatMap to correctly generate the fulfillment preview
        fulfillmentPreview: preselectedPackage.inclusions.flatMap(inc => 
          // Create an array with a length equal to the number of wearers
          Array.from({ length: inc.wearerNum }, (_, i) => ({
            // If wearerNum is 1, the role is just the name. If > 1, add a number.
            role: inc.wearerNum > 1 ? `${inc.name} ${i + 1}` : inc.name,
            // Use the isCustom flag from the inclusion definition
            isCustom: !!inc.isCustom
          }))
        )
      };
      setReservation(prev => ({ ...prev, packageReservations: [newPackageReservation] }));
      navigate(location.pathname, { replace: true, state: {} }); // Clear state to prevent re-adding
      setCurrentStep(3);
      return; // Stop further checks
    }

    // Check for pending item reservations from sessionStorage
    const pendingItemsJSON = sessionStorage.getItem('pendingReservations');
    if (pendingItemsJSON) {
      try {
        const pendingItems: ItemReservation[] = JSON.parse(pendingItemsJSON);
        setReservation(prev => ({...prev, itemReservations: [...prev.itemReservations, ...pendingItems]}));
        sessionStorage.removeItem('pendingReservations');
        setCurrentStep(3);
      } catch (error) {
        console.error("Failed to parse pending reservations", error);
        sessionStorage.removeItem('pendingReservations');
      }
    }
  }, []);

  useEffect(() => {
    const itemTotal = reservation.itemReservations.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const packageTotal = reservation.packageReservations.reduce((sum, pkg) => sum + pkg.price, 0);
    const newSubtotal = itemTotal + packageTotal;
    setSubtotal(newSubtotal);

    if (newSubtotal > 0 && (!reservation.financials.payments || reservation.financials.payments.length === 0)) {
        setReservation(prev => ({ ...prev, financials: { ...prev.financials, payments: [{ amount: newSubtotal * 0.5, date: new Date(), method: 'GCash', referenceNumber: '' }] } }));
    } else if (newSubtotal === 0 && reservation.financials.payments && reservation.financials.payments.length > 0) {
        setReservation(prev => ({...prev, financials: { ...prev.financials, payments: [] }}));
    }
  }, [reservation.itemReservations, reservation.packageReservations]);

  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 5) { // Review Step -> Submit
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
      const { customerInfo, eventDate, reserveStartDate } = reservation;
      if (!customerInfo.name.trim()) newErrors.customerInfo.name = 'Full name is required.';
      if (!/^09\d{9}$/.test(customerInfo.phoneNumber)) newErrors.customerInfo.phoneNumber = 'Phone number must be a valid 11-digit number starting with 09.';
      if (!customerInfo.address.province) newErrors.customerInfo.address.province = 'Province is required.';
      if (!customerInfo.address.city) newErrors.customerInfo.address.city = 'City/Municipality is required.';
      if (!customerInfo.address.barangay) newErrors.customerInfo.address.barangay = 'Barangay is required.';
      if (!customerInfo.address.street.trim()) newErrors.customerInfo.address.street = 'Street address is required.';
      if (new Date(reserveStartDate) > new Date(eventDate)) newErrors.eventDate = 'Rental start date cannot be after the event date.';
      isValid = Object.keys(newErrors.customerInfo).length <= 1 && Object.keys(newErrors.customerInfo.address).length === 0 && !newErrors.eventDate;
    }
    
    if (step === 3) {
      if (reservation.itemReservations.length === 0 && reservation.packageReservations.length === 0) {
        newErrors.reservations = 'At least one item or package must be reserved.';
        isValid = false;
      }
    }
    
    if (step === 4) {
      const payment = reservation.financials.payments?.[0];
      if (subtotal > 0 && (!payment || !payment.referenceNumber?.trim())) {
        addAlert('A payment reference number is required.', 'warning');
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/reservations', reservation);
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
      case 2: return <CustomerAndDateInfo reservation={reservation} setReservation={setReservation} errors={errors} />;
      case 3: return <ReservationManager reservation={reservation} setReservation={setReservation} errors={errors} />;
      case 4: return <StepPayment reservation={reservation} setReservation={setReservation} subtotal={subtotal} />;
      case 5: return <StepReview reservation={reservation} />;
      default: return null;
    }
  };

  const isFinishStep = currentStep === WIZARD_STEPS.length;
  if (isFinishStep) {
    return (
      <Container className="text-center py-5">
        <Card className="p-5 shadow-sm border-0" style={{ maxWidth: '600px', margin: 'auto' }}>
          <CheckCircleFill className="text-success mx-auto mb-4" size={60} />
          <h1 className="h3">Thank You!</h1>
          <p className="lead text-muted">Your reservation request has been successfully submitted. We will contact you shortly to confirm the details.</p>
          <div className="mt-4"><Button variant="primary" onClick={() => navigate('/products')} className="me-2">Browse More Outfits</Button></div>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            <Card className="shadow-sm">
              <Card.Header as="h2" className="text-center border-0 bg-transparent pt-4">Create a New Reservation</Card.Header>
              <Card.Body className="p-4 p-md-5">
                <BookingProgressBar currentStep={currentStep} steps={WIZARD_STEPS} />
                <div className="mt-5">{renderStepContent()}</div>
                {currentStep > 1 && (
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
      <footer className="bg-white text-dark py-3 border-top"><CustomFooter /></footer>
    </>
  );
}

export default CreateReservationPage;