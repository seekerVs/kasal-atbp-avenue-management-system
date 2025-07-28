// client/src/layouts/appointmentViewer/AppointmentViewer.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert, Breadcrumb, Card, Badge, Button, Form, InputGroup } from 'react-bootstrap';
import { format, setHours, setMinutes, getDay } from 'date-fns';
import { PersonFill, CalendarEvent, PlusCircleFill, Trash, XCircleFill, CheckCircleFill } from 'react-bootstrap-icons';

import { Appointment, CustomTailoringItem, MeasurementRef } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { MultiImageDropzone, MultiImageDropzoneRef } from '../../components/multiImageDropzone/MultiImageDropzone';
import DatePicker from 'react-datepicker';

interface UnavailabilityRecord {
  date: string;
}

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

function AppointmentViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addAlert } = useAlert();
  const dropzoneRef = useRef<MultiImageDropzoneRef>(null);

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [processedItem, setProcessedItem] = useState<CustomTailoringItem | null>(null);
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);

  const [showReschedule, setShowReschedule] = useState(false);
  const [newAppointmentDate, setNewAppointmentDate] = useState<Date | null>(null);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchInitialData = async () => {
      setLoading(true); setError(null);
      try {
        const [appointmentRes, refsRes, unavailableRes] = await Promise.all([
          api.get(`/appointments/${id}`),
          api.get('/measurementrefs'),
          api.get('/unavailability'),
        ]);
        
        const fetchedAppointment: Appointment = appointmentRes.data;
        setAppointment(fetchedAppointment);
        setNewAppointmentDate(new Date(fetchedAppointment.appointmentDate));
        setMeasurementRefs(refsRes.data || []);
        setUnavailableDates(unavailableRes.data.map((rec: UnavailabilityRecord) => new Date(rec.date)));
        
        setProcessedItem(fetchedAppointment.processedItemData || {
            _id: `custom_${fetchedAppointment._id}`,
            name: `Custom Item for ${fetchedAppointment.customerInfo.name}`, price: 0, quantity: 1,
            tailoringType: 'Tailored for Purchase', outfitCategory: '', outfitType: '',
            measurements: {}, materials: [''], designSpecifications: fetchedAppointment.statusNote || '',
            referenceImages: []
        });
      } catch (err) {
        setError("Failed to load appointment details.");
      } finally { setLoading(false); }
    };
    fetchInitialData();
  }, [id]);
  
  const uniqueCategories = useMemo(() => Array.from(new Set(measurementRefs.map(ref => ref.category))), [measurementRefs]);
  const filteredOutfits = useMemo(() => measurementRefs.filter(ref => ref.category === processedItem?.outfitCategory), [processedItem?.outfitCategory, measurementRefs]);
  const selectedRef = useMemo(() => measurementRefs.find(ref => ref.outfitName === processedItem?.outfitType && ref.category === processedItem?.outfitCategory), [processedItem, measurementRefs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!processedItem) return;
    const { name, value } = e.target;
    const parsedValue = (name === 'price' || name === 'quantity') ? parseFloat(value) || 0 : value;
    setProcessedItem({ ...processedItem, [name]: parsedValue });
  };
  
  const handleMeasurementChange = (field: string, value: string) => {
    if (!processedItem) return;
    setProcessedItem({ ...processedItem, measurements: { ...processedItem.measurements, [field]: value } });
  };
  
  const handleDynamicListChange = (index: number, value: string) => {
    if (!processedItem) return;
    const newList = [...processedItem.materials];
    newList[index] = value;
    setProcessedItem({ ...processedItem, materials: newList });
  };

  const handleUpdateAppointment = async (updateData: Partial<Appointment>) => {
    if (!appointment) return;
    setIsSaving(true);
    try {
      const response = await api.put(`/appointments/${appointment._id}`, updateData);
      setAppointment(response.data);
      addAlert('Appointment updated successfully!', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to update appointment.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmSchedule = () => handleUpdateAppointment({ status: 'Confirmed' });
  const handleMarkAsNoShow = () => handleUpdateAppointment({ status: 'No Show' });
  const handleCancelAppointment = () => {
    handleUpdateAppointment({ status: 'Cancelled' });
    setShowCancelModal(false);
  };

  const isFilterDate = (date: Date) => {
    const day = getDay(date);
    const isSunday = day === 0;
    const isUnavailable = unavailableDates.some(
      (unavailableDate) => new Date(unavailableDate).toDateString() === date.toDateString()
    );
    return !isSunday && !isUnavailable;
  };

  const handleReschedule = () => {
    if (newAppointmentDate) {
      handleUpdateAppointment({ appointmentDate: newAppointmentDate });
      setShowReschedule(false);
    }
  };
  
  const handleSaveDetails = async () => {
    if (!appointment || !processedItem) return;
    setIsSaving(true);
    try {
      const uploadedUrls = await dropzoneRef.current?.uploadAll();
      const finalItemData = { ...processedItem, referenceImages: uploadedUrls || [] };
      
      const response = await api.put(`/appointments/${appointment._id}`, {
        status: 'Completed',
        processedItemData: finalItemData,
      });
      
      setAppointment(response.data);
      setProcessedItem(response.data.processedItemData);
      addAlert('Appointment details saved successfully!', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to save details.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRental = async () => {
    if (!appointment) return;
    setIsSaving(true);
    try {
      const response = await api.post('/rentals/from-appointment', { appointmentId: appointment._id });
      const newRental = response.data;
      addAlert(`Rental ${newRental._id} created! Redirecting...`, 'success');
      setTimeout(() => navigate(`/rentals/${newRental._id}`), 2000);
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to create rental.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) return <Container className="text-center py-5"><Spinner /></Container>;
  if (error) return <Container><Alert variant="danger">{error}</Alert></Container>;
  if (!appointment || !processedItem) return <Container><Alert variant="info">Appointment data not found.</Alert></Container>;
  
  const isProcessed = appointment.status === 'Completed' && !!appointment.processedItemData;
  const getStatusBadgeVariant = (status: Appointment['status']): BadgeVariant => {
      switch (status) {
        case 'Pending': return 'primary';
        case 'Confirmed': return 'info';
        case 'Completed': return 'success';
        case 'Cancelled': return 'danger';
        case 'No Show': return 'warning';
        default: return 'secondary';
      }
    };

  return (
    <Container fluid>
      <Breadcrumb><Breadcrumb.Item onClick={() => navigate('/manage-appointments')}>Appointments Manager</Breadcrumb.Item><Breadcrumb.Item active>View Appointment</Breadcrumb.Item></Breadcrumb>
      <h2 className="mb-4">Appointment Details: {appointment._id}</h2>
      
      <Row className="g-4">
        <Col lg={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
              <span>Appointment Info</span>
              <Badge bg={getStatusBadgeVariant(appointment.status)}>{appointment.status}</Badge>
            </Card.Header>
            <Card.Body>
              <p><PersonFill className="me-2 text-muted"/><strong>Customer:</strong> {appointment.customerInfo.name}</p>
              <p><CalendarEvent className="me-2 text-muted"/><strong>Date:</strong> {format(new Date(appointment.appointmentDate), 'MMMM dd, yyyy, h:mm a')}</p>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm">
            <Card.Header as="h5">Actions</Card.Header>
            <Card.Body className="d-grid gap-2">
              {appointment.status === 'Pending' && (
                <Button variant="success" onClick={handleConfirmSchedule} disabled={isSaving}>
                  <CheckCircleFill className="me-2"/>Confirm Schedule
                </Button>
              )}

              {appointment.status === 'Confirmed' && (
                <Button variant="primary" onClick={handleSaveDetails} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Details & Mark Completed'}
                </Button>
              )}

              {['Pending', 'Confirmed'].includes(appointment.status) && (
                <Button variant="secondary" onClick={() => setShowReschedule(!showReschedule)}>
                  {showReschedule ? 'Cancel Reschedule' : 'Reschedule Appointment'}
                </Button>
              )}

              {isProcessed && (
                <Button variant="danger" onClick={handleCreateRental} disabled={isSaving}>
                  {isSaving ? 'Creating...' : 'Create Rental'}
                </Button>
              )}
              
              {appointment.status === 'Confirmed' && (
                <Button variant="warning" onClick={handleMarkAsNoShow} disabled={isSaving}>
                  Mark as No Show
                </Button>
              )}
              
              {['Pending', 'Confirmed'].includes(appointment.status) && (
                <Button variant="outline-danger" onClick={() => setShowCancelModal(true)} disabled={isSaving}>
                  <XCircleFill className="me-2"/>Cancel Appointment
                </Button>
              )}
            </Card.Body>
            {showReschedule && (
              <Card.Footer>
                <Form.Group className="mb-2">
                  <Form.Label className="small">New Date & Time</Form.Label>
                  <DatePicker
                    selected={newAppointmentDate}
                    onChange={(date) => setNewAppointmentDate(date)}
                    showTimeSelect filterDate={isFilterDate}
                    minDate={new Date()}
                    minTime={setHours(setMinutes(new Date(), 0), 9)}
                    maxTime={setHours(setMinutes(new Date(), 0), 17)}
                    dateFormat="MMMM d, yyyy h:mm aa"
                    className="form-control"
                  />
                </Form.Group>
                <div className="d-grid">
                  <Button size="sm" onClick={handleReschedule} disabled={!newAppointmentDate || isSaving}>
                    Save New Schedule
                  </Button>
                </div>
              </Card.Footer>
            )}
          </Card>
        </Col>
        
        <Col lg={8}>
          <Card className="shadow-sm">
            <Card.Header as="h5">Custom Item Processing</Card.Header>
            <Card.Body>
              <Form>
                <Form.Group className="mb-3"><Form.Label>Item Name</Form.Label><Form.Control name="name" value={processedItem.name} onChange={handleInputChange} /></Form.Group>
                <Row>
                  <Col md={4}><Form.Group className="mb-3"><Form.Label>Outfit Category</Form.Label><Form.Select name="outfitCategory" value={processedItem.outfitCategory} onChange={handleInputChange}><option>Select...</option>{uniqueCategories.map(c => <option key={c}>{c}</option>)}</Form.Select></Form.Group></Col>
                  <Col md={4}><Form.Group className="mb-3"><Form.Label>Outfit Type</Form.Label><Form.Select name="outfitType" value={processedItem.outfitType} onChange={handleInputChange} disabled={!processedItem.outfitCategory}><option>Select...</option>{filteredOutfits.map(o => <option key={o._id}>{o.outfitName}</option>)}</Form.Select></Form.Group></Col>
                  <Col md={4}><Form.Group className="mb-3"><Form.Label>Price (₱)</Form.Label><Form.Control name="price" type="number" value={processedItem.price} onChange={handleInputChange} /></Form.Group></Col>
                </Row>
                {selectedRef && (
                  <>
                    <hr/><h6>Measurements (cm)</h6>
                    <Row>{selectedRef.measurements.map(m => (<Col md={4} key={m}><Form.Group className="mb-2"><Form.Label className="small text-capitalize">{m}</Form.Label><Form.Control size="sm" type="number" value={processedItem.measurements[m] || ''} onChange={(e) => handleMeasurementChange(m, e.target.value)} /></Form.Group></Col>))}</Row>
                  </>
                )}
                <hr />
                <Form.Group className="mb-3"><Form.Label>Design Specifications</Form.Label><Form.Control as="textarea" rows={3} name="designSpecifications" value={processedItem.designSpecifications} onChange={handleInputChange} /></Form.Group>
                <Form.Group className="mb-3"><Form.Label>Materials</Form.Label>
                    {(processedItem.materials || []).map((mat, index) => (
                        <InputGroup key={index} className="mb-2"><Form.Control value={mat} onChange={(e) => handleDynamicListChange(index, e.target.value)} /><Button variant="outline-danger" onClick={() => setProcessedItem(p => p ? {...p, materials: p.materials.filter((_, i) => i !== index)} : null)}><Trash /></Button></InputGroup>
                    ))}
                    <Button variant="outline-secondary" size="sm" onClick={() => setProcessedItem(p => p ? {...p, materials: [...p.materials, '']} : null)}><PlusCircleFill className="me-1" />Add Material</Button>
                </Form.Group>
                <Form.Group className="mb-3"><Form.Label>Reference Images</Form.Label><MultiImageDropzone ref={dropzoneRef} existingImageUrls={processedItem.referenceImages || []} /></Form.Group>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default AppointmentViewer;