import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import { ChatQuote, CheckCircleFill, Download } from 'react-bootstrap-icons';
import { format } from 'date-fns';

import { Appointment, FormErrors, ShopSettings } from '../../types';
import { ValidatedInput } from '../../components/forms/ValidatedInput';
import { AddressSelector } from '../../components/addressSelector/AddressSelector';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { DayBlockPicker } from '../../components/dayBlockPicker/DayBlockPicker';
import { DataPrivacyModal } from '../../components/modals/dataPrivacyModal/DataPrivacyModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { AppointmentSummary } from '../../components/appointmentSummary/AppointmentSummary';

interface UnavailabilityRecord {
  date: string;
}

// Initial state now uses a full Date object
const getInitialAppointmentState = (): Omit<Appointment, '_id' | 'createdAt' | 'updatedAt' | 'status'> => ({
  customerInfo: { name: '', email: '', phoneNumber: '', address: { province: 'Camarines Norte', city: '', barangay: '', street: '' } },
  appointmentDate: null,
  notes: '',
  timeBlock: null,
});

type BlockType = 'morning' | 'afternoon' | '';

function CreateAppointmentPage() {
  const { addAlert } = useAlert();

  const [appointment, setAppointment] = useState(getInitialAppointmentState);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
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
        console.error("Failed to fetch initial page data", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleCustomerChange = (field: string, value: string) => setAppointment(p => ({ ...p, customerInfo: { ...p.customerInfo, [field]: value } }));
  const handleAddressChange = (field: keyof Appointment['customerInfo']['address'], value: string) => setAppointment(p => ({ ...p, customerInfo: { ...p.customerInfo, address: { ...p.customerInfo.address, [field]: value } } }));

  const handleDateAndBlockChange = (date: Date | null, block: BlockType) => {
    setAppointment(p => ({ 
      ...p, 
      appointmentDate: date,
      timeBlock: block === '' ? null : block
    }));
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
    } else if (!appointment.timeBlock) { // Check for the block on the main state object
        newErrors.appointmentDate = 'An appointment time block (Morning/Afternoon) is required..';
    }
    setErrors(newErrors);
    const hasAddressErrors = Object.keys(newErrors.customerInfo.address).length > 0;
    const hasCustomerErrors = Object.keys(newErrors.customerInfo).filter(key => key !== 'address').length > 0;
    const hasDateError = !!newErrors.appointmentDate;

    return !hasAddressErrors && !hasCustomerErrors && !hasDateError;
  };

  const handleSubmit = () => {
    if (validate()) {
      setShowPrivacyModal(true);
    } else {
        // --- Add a user-friendly alert ---
        addAlert("Please fill in all required fields marked with an asterisk (*).", "warning");
    }
  };

  const handleProceedWithSubmit = async () => {
    setShowPrivacyModal(false);
    setIsSubmitting(true);
    try {
      if (!appointment.appointmentDate) {
        throw new Error("Appointment date is missing.");
      }

      const response = await api.post('/appointments', {
        customerInfo: appointment.customerInfo,
        // Format the date to a simple YYYY-MM-DD string
        appointmentDate: format(appointment.appointmentDate, 'yyyy-MM-dd'),
        timeBlock: appointment.timeBlock,
        notes: appointment.notes,
      });

      const savedAppointment: Appointment = response.data;
      addAlert('Your appointment request has been submitted successfully!', 'success');
      setSubmittedAppointment(savedAppointment); 
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
    setAppointment(getInitialAppointmentState());
    setErrors({});
    setSubmittedAppointment(null);
    setIsSubmitted(false);
  };

  const renderSuccessView = (details: Appointment) => (
    <>
      {/* This renders the detailed summary OFF-SCREEN, ready for PDF capture */}
      <div style={{ position: 'fixed', left: '-2000px', top: 0, zIndex: -1 }}>
        <AppointmentSummary ref={summaryRef} appointment={details} shopSettings={shopSettings} />
      </div>

      {/* This is the new, clean success message shown to the user */}
      <div className="text-center p-3">
        <CheckCircleFill className="text-success mb-3" size={50} />
        <h3 className="mb-2">Appointment Request Submitted!</h3>
        <p className="text-muted mb-4">
            Thank you, {details.customerInfo.name.split(' ')[0]}. Your request has been received. Our staff will contact you shortly to confirm your schedule.
        </p>
        <div className="d-inline-block p-3 border rounded mb-4">
          <p className="text-muted small mb-0" style={{ letterSpacing: '1px' }}>YOUR APPOINTMENT ID</p>
          <p className="h4 fw-bold text-danger mb-0">{details._id}</p>
        </div>
        <div className="text-start bg-light p-3 rounded small">
            <p className="mb-2">
                <Badge pill bg="primary" className="me-2">1</Badge> 
                Please check the status of your request using the <strong>Request Tracker</strong> page.
            </p>
            <p className="mb-0">
                <Badge pill bg="primary" className="me-2">2</Badge> 
                For any urgent concerns, feel free to <strong>contact us</strong> with your Appointment ID.
            </p>
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
          Download Confirmation
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
                      <Form.Label>Preferred Appointment Schedule<span className="text-danger">*</span></Form.Label>
                      <Alert variant="info" className="small py-2">
                        <strong>NOTE:</strong> Select a date to see available Morning/Afternoon blocks. Our staff will contact you to finalize a specific time within that block.
                      </Alert>
                      <DayBlockPicker
                        selectedDate={appointment.appointmentDate}
                        selectedBlock={appointment.timeBlock || ''}
                        onChange={handleDateAndBlockChange}
                        minDate={new Date()}
                        unavailableDates={unavailableDates}
                      />
                      {errors.appointmentDate && <div className="text-danger small mt-1">{errors.appointmentDate}</div>}
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label><ChatQuote className="me-2"/>Notes or Initial Ideas (Optional)</Form.Label>
                      <Form.Control 
                        as="textarea" 
                        rows={3} 
                        placeholder="Describe your vision, what the event is for, etc." 
                        value={appointment.notes || ''} 
                        onChange={(e) => setAppointment(p => ({...p, notes: e.target.value}))} 
                      />
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
    </>
  );
}

export default CreateAppointmentPage;