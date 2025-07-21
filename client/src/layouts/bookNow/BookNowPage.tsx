import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Spinner, Row, Col } from 'react-bootstrap';
import { CheckCircleFill } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import { format, addDays } from 'date-fns';

import { Booking, FormErrors } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import CustomFooter from '../../components/customFooter/CustomFooter';

// WIZARD STRUCTURAL COMPONENTS
import { BookingProgressBar } from '../../components/booking/progressBar/BookingProgressBar';
import { WizardControls } from '../../components/booking/WizardControls';

// WIZARD STEP COMPONENTS
import { StepReminders } from '../../components/booking/steps/StepReminders';
import { CustomerAndDateInfo } from '../../components/booking/CustomerAndDateInfo';
import { ReservationManager } from '../../components/booking/ReservationManager';
import { StepPayment } from '../../components/booking/steps/StepPayment';
import { StepReview } from '../../components/booking/steps/StepReview';

const getInitialBookingState = (): Omit<Booking, '_id' | 'createdAt' | 'updatedAt' | 'status'> => {
  const today = new Date();
  return {
    customerInfo: { name: '', email: '', phoneNumber: '', address: { province: '', city: '', barangay: '', street: '' } },
    eventDate: format(addDays(today, 7), 'yyyy-MM-dd'),
    rentalStartDate: format(addDays(today, 5), 'yyyy-MM-dd'),
    rentalEndDate: format(addDays(today, 9), 'yyyy-MM-dd'),
    financials: {}, itemReservations: [], packageReservations: [], appointments: [],
  };
};

const WIZARD_STEPS = ['Reminders', 'Information', 'Booking', 'Payment', 'Review', 'Finish'];

function BookNowPage() {
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  const [currentStep, setCurrentStep] = useState(1);
  const [booking, setBooking] = useState(getInitialBookingState());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    const itemTotal = booking.itemReservations.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const packageTotal = booking.packageReservations.reduce((sum, pkg) => sum + pkg.price, 0);
    const newSubtotal = itemTotal + packageTotal;
    setSubtotal(newSubtotal);

    if (newSubtotal > 0 && (!booking.financials.payments || booking.financials.payments.length === 0)) {
      setBooking(prev => ({ ...prev, financials: { ...prev.financials, payments: [{ amount: newSubtotal * 0.5, date: new Date(), method: 'GCash', referenceNumber: '' }] } }));
    } else if (newSubtotal === 0 && booking.financials.payments && booking.financials.payments.length > 0) {
      setBooking(prev => ({...prev, financials: { ...prev.financials, payments: [] }}));
    }
  }, [booking.itemReservations, booking.packageReservations]);

  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleNext = () => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (currentStep === 2) { // Validate Step 2: Information
      // --- THIS IS THE CORRECTED LOGIC ---
      const { customerInfo } = booking;
      
      // Initialize the nested error objects
      newErrors.customerInfo = {};
      newErrors.customerInfo.address = {};

      if (!customerInfo.name.trim()) newErrors.customerInfo.name = 'Full name is required.';
      if (!customerInfo.phoneNumber.trim()) newErrors.customerInfo.phoneNumber = 'Phone number is required.';
      if (customerInfo.email && !/\S+@\S+\.\S+/.test(customerInfo.email)) newErrors.customerInfo.email = 'Please enter a valid email address.';
      
      // Now it's safe to assign to the nested properties
      if (!customerInfo.address.province) newErrors.customerInfo.address.province = 'Province is required.';
      if (!customerInfo.address.city) newErrors.customerInfo.address.city = 'City/Municipality is required.';
      if (!customerInfo.address.barangay) newErrors.customerInfo.address.barangay = 'Barangay is required.';
      if (!customerInfo.address.street.trim()) newErrors.customerInfo.address.street = 'Street address is required.';
      
      // The final check is now also safe
      isValid = !(
        Object.values(newErrors.customerInfo.address).some(e => e) || 
        newErrors.customerInfo.name || 
        newErrors.customerInfo.phoneNumber || 
        newErrors.customerInfo.email
      );
      // --- END OF CORRECTION ---
    }

    if (currentStep === 3) { // Validate Step 3: Booking
      if (booking.itemReservations.length === 0 && booking.packageReservations.length === 0 && booking.appointments.length === 0) {
        newErrors.reservations = 'At least one item, package, or custom appointment must be reserved.';
        isValid = false;
      }
    }

    if (currentStep === 4) { // Validate Step 4: Payment
      const payment = booking.financials.payments?.[0];
      if (subtotal > 0 && (!payment || !payment.referenceNumber?.trim())) {
        addAlert('A payment reference number is required.', 'warning');
        isValid = false;
      }
    }

    setErrors(newErrors);

    if (isValid) {
      if (currentStep === 5) { // Review Step's "Next" button is the submit action
        handleSubmit();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.post('/bookings', booking);
      setCurrentStep(prev => prev + 1); // Move to the "Finish" step
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to submit booking request.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return <StepReminders onNext={() => setCurrentStep(2)} />;
      case 2: return <CustomerAndDateInfo booking={booking} setBooking={setBooking} errors={errors} />;
      case 3: return <ReservationManager booking={booking} setBooking={setBooking} errors={errors} />;
      case 4: return <StepPayment booking={booking} setBooking={setBooking} subtotal={subtotal} />;
      case 5: return <StepReview booking={booking} />;
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
            <p className="lead text-muted">Your booking request has been successfully submitted. We will contact you shortly to confirm the details.</p>
            <div className="mt-4">
                <Button variant="primary" onClick={() => navigate('/products')} className="me-2">Browse More Outfits</Button>
                <Button variant="outline-secondary" onClick={() => { setBooking(getInitialBookingState()); setCurrentStep(1); }}>Make Another Booking</Button>
            </div>
        </Card>
      </Container>
    );
  }

  return (
    <>
      <Container fluid className="py-4 bg-light">
        <Row className="justify-content-center">
            <Col lg={10} xl={8}>
                <Card className="shadow-sm">
                  <Card.Header as="h2" className="text-center border-0 bg-transparent pt-4">Set an Appointment</Card.Header>
                  <Card.Body className="p-4 p-md-5">
                    <BookingProgressBar currentStep={currentStep} steps={WIZARD_STEPS} />
                    <div className="mt-5">{renderStepContent()}</div>
                    {currentStep > 1 && (
                      <WizardControls
                        currentStep={currentStep} totalSteps={WIZARD_STEPS.length}
                        onBack={handleBack} onNext={handleNext}
                        isSubmitting={isSubmitting}
                      />
                    )}
                  </Card.Body>
                </Card>
            </Col>
        </Row>
      </Container>
      <footer className="bg-white text-dark py-3 border-top">
        <CustomFooter />
      </footer>
    </>
  );
}

export default BookNowPage;