import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { ChatQuote } from 'react-bootstrap-icons';
import { setHours, setMinutes, addDays, getDay } from 'date-fns';

// 1. Import the date picker component and its CSS
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

import { Appointment, FormErrors } from '../../types';
import { ValidatedInput } from '../../components/forms/ValidatedInput';
import { AddressSelector } from '../../components/addressSelector/AddressSelector';
import CustomFooter from '../../components/customFooter/CustomFooter';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';

interface UnavailabilityRecord {
  date: string;
}

// Initial state now uses a full Date object
const getInitialAppointmentState = (): Omit<Appointment, '_id' | 'createdAt' | 'updatedAt' | 'status'> => ({
  customerInfo: { name: '', email: '', phoneNumber: '', address: { province: 'CAMARINES NORTE', city: '', barangay: '', street: '' } },
  appointmentDate: setHours(setMinutes(addDays(new Date(), 14), 0), 9), // Default to 9:00 AM, 14 days from now
  statusNote: '',
});

function CreateAppointmentPage() {
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  const [appointment, setAppointment] = useState(getInitialAppointmentState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]); // 2. State for fetched unavailable dates

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
    if (date) {
      setAppointment(p => ({ ...p, appointmentDate: date }));
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = { customerInfo: { address: {} } };
    if (!appointment.customerInfo.name.trim()) newErrors.customerInfo.name = 'Full name is required.';
    if (!/^09\d{9}$/.test(appointment.customerInfo.phoneNumber)) newErrors.customerInfo.phoneNumber = 'Phone number must be a valid 11-digit number starting with 09.';
    if (!appointment.customerInfo.address.city) newErrors.customerInfo.address.city = 'City/Municipality is required.';
    if (!appointment.customerInfo.address.barangay) newErrors.customerInfo.address.barangay = 'Barangay is required.';
    if (!appointment.customerInfo.address.street.trim()) newErrors.customerInfo.address.street = 'Street address is required.';
    if (!appointment.appointmentDate) newErrors.appointmentDate = 'An appointment date and time is required.';
    setErrors(newErrors);
    return !(Object.keys(newErrors.customerInfo.address).length || Object.keys(newErrors.customerInfo).length > 1 || newErrors.appointmentDate);
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await api.post('/appointments', appointment);
      addAlert('Your appointment request has been submitted successfully! We will contact you to confirm.', 'success');
      navigate('/');
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to submit appointment request.', 'danger');
    } finally { setIsSubmitting(false); }
  };

  // 4. Helper function to filter out Sundays and unavailable dates
  const isFilterDate = (date: Date) => {
    const day = getDay(date);
    const isSunday = day === 0;
    const isUnavailable = unavailableDates.some(
      (unavailableDate) => new Date(unavailableDate).toDateString() === date.toDateString()
    );
    return !isSunday && !isUnavailable;
  };

  return (
    <>
      <Container fluid className="py-5">
        <Row className="justify-content-center">
          <Col lg={10} xl={8}>
            <Card className="shadow-sm">
              <Card.Header as="h2" className="text-center border-0 bg-transparent pt-4">Book a Custom Tailoring Appointment</Card.Header>
              <Card.Body className="p-4 p-md-5">
                <p className="text-center text-muted mb-4">
                  Please provide your information and a preferred date and time for your consultation. We will contact you to confirm the final schedule.
                </p>
                <hr />
                {/* (Customer and Address input fields remain the same) */}
                <ValidatedInput label="Full Name*" name="name" value={appointment.customerInfo.name} onChange={(e) => handleCustomerChange('name', e.target.value)} error={errors.customerInfo?.name} />
                <Row>
                  <Col md={6}><ValidatedInput label="Phone Number*" name="phoneNumber" value={appointment.customerInfo.phoneNumber} onChange={(e) => handleCustomerChange('phoneNumber', e.target.value)} error={errors.customerInfo?.phoneNumber} type="tel" maxLength={11} pattern="09[0-9]{9}" /></Col>
                  <Col md={6}><ValidatedInput label="Email Address" name="email" type="email" value={appointment.customerInfo.email || ''} onChange={(e) => handleCustomerChange('email', e.target.value)} error={errors.customerInfo?.email} /></Col>
                </Row>
                <hr />
                <Row className="g-3 mb-3">
                  <AddressSelector value={appointment.customerInfo.address} onChange={handleAddressChange} errors={errors.customerInfo?.address || {}} />
                  <Col xs={12} md={6} lg={3}><ValidatedInput label="Street Name, Building, House No.*" name="street" as="textarea" rows={1} value={appointment.customerInfo.address.street} onChange={(e) => handleAddressChange('street', e.target.value)} error={errors.customerInfo?.address?.street} className="mb-0" /></Col>
                </Row>
                <hr />
                
                {/* --- 5. REPLACE the old date input with the new DatePicker --- */}
                <Form.Group className="mb-3">
                  <Form.Label>Preferred Appointment Date & Time*</Form.Label>
                  <DatePicker
                    selected={appointment.appointmentDate}
                    onChange={handleDateChange}
                    showTimeSelect
                    filterDate={isFilterDate}
                    minDate={new Date()}
                    minTime={setHours(setMinutes(new Date(), 0), 9)}   // 9:00 AM
                    maxTime={setHours(setMinutes(new Date(), 0), 17)}  // 5:00 PM
                    dateFormat="MMMM d, yyyy h:mm aa"
                    className="form-control" // Apply Bootstrap styling
                    placeholderText="Select a date and time"
                  />
                  {errors.appointmentDate && <div className="text-danger small mt-1">{errors.appointmentDate}</div>}
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label><ChatQuote className="me-2"/>Notes or Initial Ideas (Optional)</Form.Label>
                  <Form.Control as="textarea" rows={3} placeholder="Describe your vision, what the event is for, etc." value={appointment.statusNote || ''} onChange={(e) => setAppointment(p => ({...p, statusNote: e.target.value}))} />
                </Form.Group>
                <div className="d-grid mt-4">
                  <Button variant="danger" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <Spinner as="span" size="sm" /> : 'Submit Request'}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
      <footer className="bg-white text-dark py-3 border-top"><CustomFooter /></footer>
    </>
  );
}

export default CreateAppointmentPage;