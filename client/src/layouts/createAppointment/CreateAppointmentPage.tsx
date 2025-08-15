import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent, ChatQuote, CheckCircleFill, Download, EnvelopeFill, GeoAltFill, PersonFill, TelephoneFill } from 'react-bootstrap-icons';
import { setHours, setMinutes, addDays, format } from 'date-fns';

import { Appointment, FormErrors } from '../../types';
import { ValidatedInput } from '../../components/forms/ValidatedInput';
import { AddressSelector } from '../../components/addressSelector/AddressSelector';
import CustomFooter from '../../components/customFooter/CustomFooter';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { DateTimePicker } from '../../components/dateTimePicker/DateTimePicker';
import { DataPrivacyModal } from '../../components/modals/dataPrivacyModal/DataPrivacyModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CustomerInfoDisplay } from '../../components/customerInfoDisplay/CustomerInfoDisplay';

interface UnavailabilityRecord {
  date: string;
}

// Initial state now uses a full Date object
const getInitialAppointmentState = (): Omit<Appointment, '_id' | 'createdAt' | 'updatedAt' | 'status'> => ({
  customerInfo: { name: '', email: '', phoneNumber: '', address: { province: 'Camarines Norte', city: '', barangay: '', street: '' } },
  appointmentDate: null,
  statusNote: '',
});

function CreateAppointmentPage() {
  const { addAlert } = useAlert();

  const [appointment, setAppointment] = useState(getInitialAppointmentState);
  const [selectedTime, setSelectedTime] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]); // 2. State for fetched unavailable dates
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAppointment, setSubmittedAppointment] = useState<Appointment | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null); 

  // 3. Fetch unavailable dates when the component mounts
  useEffect(() => {
    const fetchUnavailability = async () => {
      try {
        const response = await api.get('/unavailability');
        const dates = response.data.map((rec: UnavailabilityRecord) => new Date(rec.date));
        setUnavailableDates(dates);
      } catch (err) {
        console.error("Failed to fetch unavailable dates", err);
      }
    };
    fetchUnavailability();
  }, []);

  const handleCustomerChange = (field: string, value: string) => setAppointment(p => ({ ...p, customerInfo: { ...p.customerInfo, [field]: value } }));
  const handleAddressChange = (field: keyof Appointment['customerInfo']['address'], value: string) => setAppointment(p => ({ ...p, customerInfo: { ...p.customerInfo, address: { ...p.customerInfo.address, [field]: value } } }));
  
  // This handler now receives a full Date object from the picker
  const handleDateChange = (date: Date | null) => {
    setAppointment(p => ({ ...p, appointmentDate: date }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = { customerInfo: { address: {} } };
    if (!appointment.customerInfo.name.trim()) newErrors.customerInfo.name = 'Full name is required.';
    if (!/^09\d{9}$/.test(appointment.customerInfo.phoneNumber)) newErrors.customerInfo.phoneNumber = 'Phone number must be a valid 11-digit number starting with 09.';
    if (!appointment.customerInfo.address.city) newErrors.customerInfo.address.city = 'City/Municipality is required.';
    if (!appointment.customerInfo.address.barangay) newErrors.customerInfo.address.barangay = 'Barangay is required.';
    if (!appointment.customerInfo.address.street.trim()) newErrors.customerInfo.address.street = 'Street address is required.';
    if (!appointment.appointmentDate) {
        newErrors.appointmentDate = 'An appointment date is required.';
    } 
    // ADD THIS CHECK: Ensure a time has been explicitly selected from the dropdown
    else if (!selectedTime) {
        newErrors.appointmentDate = 'An appointment time is required.';
    }
    setErrors(newErrors);
    return !(Object.keys(newErrors.customerInfo.address).length || Object.keys(newErrors.customerInfo).length > 1 || newErrors.appointmentDate);
  };

  const handleSubmit = () => {
    // This function now only validates and opens the modal.
    if (validate()) {
      setShowPrivacyModal(true);
    }
  };

  const handleProceedWithSubmit = async () => {
    setShowPrivacyModal(false); // Close the modal first
    setIsSubmitting(true);
    try {
      const response = await api.post('/appointments', appointment);
      const savedAppointment: Appointment = response.data;
      
      addAlert('Your appointment request has been submitted successfully!', 'success');
      
      // Store the response from the server in our new state
      setSubmittedAppointment(savedAppointment); 
      
      // Set the flag to true to switch the view
      setIsSubmitted(true);

    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to submit appointment request.', 'danger');
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

    html2canvas(input, { scale: 2, backgroundColor: null }) // Use scale for better resolution, transparent background
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pdfWidth - 20; // 10mm margin on each side
        const canvasAspectRatio = canvas.width / canvas.height;
        const contentHeight = contentWidth / canvasAspectRatio;

        pdf.addImage(imgData, 'PNG', 10, 10, contentWidth, contentHeight);
        pdf.save(`appointment-request-${submittedAppointment?._id}.pdf`);
      })
      .catch((err) => {
        console.error("PDF generation failed:", err);
        addAlert('Could not generate PDF. Please try again.', 'danger');
      })
      .finally(() => {
        setIsDownloading(false);
      });
  };

  const handleBookAnother = () => {
    // Reset the main appointment data back to the initial empty state
    setAppointment(getInitialAppointmentState());
    
    // Reset the selected time string
    setSelectedTime('');
    
    // Clear any validation errors
    setErrors({});
    
    // Clear the stored submitted data
    setSubmittedAppointment(null);
    
    // Flip the switch to go back to the form view
    setIsSubmitted(false);
  };

  const renderSuccessView = (details: Appointment) => (
    <>
      <div ref={summaryRef} className="p-3 px-lg-5">
        <div className="text-center">
          <CheckCircleFill className="text-success mb-2" size={50} />
          <h3 className="mb-2">Request Submitted!</h3>
          <p className="text-muted mb-4 lh-1 fw-light">
            Thank you, {details.customerInfo.name.split(' ')[0]}. We have received your request. 
            A staff member will contact you shortly to confirm your schedule. <br />
            Make sure to take a screenshot or click the "Download as PDF" button for your records.
          </p>
          
          <div className="d-inline-block p-3 rounded mb-2">
            <p className="text-muted small mb-0" style={{ letterSpacing: '1px' }}>APPOINTMENT ID</p>
            <p className="h4 fw-bold text-danger mb-0">{details._id}</p>
          </div>

          <div className="summary-container text-start py-2 border-bottom">
            <Row className="g-4">
              {/* Left Column: Customer Details */}
              <Col md={6} className="pe-md-4 border-end-md">
                <CustomerInfoDisplay customer={details.customerInfo} />
              </Col>
              
              {/* Right Column: Appointment Details */}
              <Col md={6} className="ps-md-4">
                <h5 className="mb-2 text-center fw-bold">Appointment Details</h5>
                <hr className='my-2 mx-3' />
                
                {/* Styled Date Block (replaces Alert) */}
                <div className="rounded mb-3">
                  <p className="mb-0 fw-medium"><CalendarEvent className="me-2"/>Requested Schedule:</p>
                  <p className="mb-0">{details.appointmentDate && format(new Date(details.appointmentDate), 'EEEE, MMMM dd, yyyy @ h:mm a')}</p>
                </div>

                {/* Notes Block */}
                <div>
                  <p className="mb-1 fw-medium"><ChatQuote className="me-2"/>Notes:</p>
                  <p className="text-muted fst-italic ps-4 mb-0">
                    {details.statusNote?.trim() ? details.statusNote : 'None'}
                  </p>
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </div>
      
      <div className="d-flex justify-content-center gap-2 mt-4">
        <Button onClick={handleBookAnother}>Book Another Appointment</Button>
        <Button variant="success" onClick={handleDownloadPdf} disabled={isDownloading}>
          {isDownloading ? (
              <Spinner as="span" size="sm" className="me-2" />
          ) : (
              <Download className="me-2"/>
          )}
          Download as PDF
        </Button>
      </div>
      
    </>
  );

  return (
    <>
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            <Card className="shadow-sm">
              <Card.Header as="h2" className="text-center border-0 bg-transparent pt-4">
                <p>Custom Tailoring Appointment</p>
              </Card.Header>
              <Card.Body className="p-4 pt-0">
                
                {/* --- (2) IMPLEMENT CONDITIONAL RENDERING --- */}
                {isSubmitted && submittedAppointment ? (
                  // If submitted, call our success view renderer
                  renderSuccessView(submittedAppointment)
                ) : (
                  // Otherwise, show the form
                  <>
                    <p className="text-center text-muted mb-4">
                      Please provide your information and a preferred date and time for your consultation. We will contact you to confirm the final schedule.
                    </p>
                    <hr />
                    <ValidatedInput label="Full Name" name="name" value={appointment.customerInfo.name} onChange={(e) => handleCustomerChange('name', e.target.value)} error={errors.customerInfo?.name} isRequired />
                    <Row>
                      <Col md={6}><ValidatedInput label="Phone Number" name="phoneNumber" value={appointment.customerInfo.phoneNumber} onChange={(e) => handleCustomerChange('phoneNumber', e.target.value)} error={errors.customerInfo?.phoneNumber} type="tel" maxLength={11} pattern="09[0-9]{9}" isRequired /></Col>
                      <Col md={6}><ValidatedInput label="Email Address" name="email" type="email" value={appointment.customerInfo.email || ''} onChange={(e) => handleCustomerChange('email', e.target.value)} error={errors.customerInfo?.email} /></Col>
                    </Row>
                    <hr />
                    <Row className="g-3 mb-3">
                      <AddressSelector value={appointment.customerInfo.address} onChange={handleAddressChange} errors={errors.customerInfo?.address || {}} />
                      <Col xs={12} md={6} lg={3}><ValidatedInput label="Street Name" name="street" as="textarea" rows={1} value={appointment.customerInfo.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} error={errors.customerInfo?.address?.street} className="mb-0" isRequired/></Col>
                    </Row>
                    <hr />
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Preferred Appointment Date & Time<span className="text-danger">*</span></Form.Label>
                      <Alert variant="info" className="small py-2">
                        <strong>NOTE:</strong> If a specific time is not listed, the allotted slots have already been taken.
                      </Alert>
                      <DateTimePicker
                        selectedDate={appointment.appointmentDate}
                        onChange={handleDateChange}
                        selectedTime={selectedTime}
                        onTimeChange={setSelectedTime}
                        minDate={new Date()}
                        unavailableDates={unavailableDates}
                      />
                      {errors.appointmentDate && <div className="text-danger small mt-1">{errors.appointmentDate}</div>}
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label><ChatQuote className="me-2"/>Notes or Initial Ideas (Optional)</Form.Label>
                      <Form.Control as="textarea" rows={3} placeholder="Describe your vision, what the event is for, etc." value={appointment.statusNote || ''} onChange={(e) => setAppointment(p => ({...p, statusNote: e.target.value}))} />
                    </Form.Group>
                    <Alert variant="warning" className="small py-2 mt-4">
                      For official schedule announcements and updates, please follow the Kasal Atbp. Avenue official Facebook Page.
                    </Alert>

                    <div className="d-flex justify-content-end mt-3">
                      <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Spinner as="span" size="sm" className="me-2" /> : null}
                        Submit
                      </Button>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      
      <DataPrivacyModal 
        show={showPrivacyModal}
        onHide={() => setShowPrivacyModal(false)}
        onProceed={handleProceedWithSubmit}
      />

      <footer className="bg-white text-dark py-3 border-top"><CustomFooter /></footer>
    </>
  );
}

export default CreateAppointmentPage;