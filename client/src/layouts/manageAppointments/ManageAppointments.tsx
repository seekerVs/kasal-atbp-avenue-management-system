// client/src/layouts/manageAppointments/ManageAppointments.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Card, Nav, Spinner, Alert, InputGroup, Form, Button, Row, Col, Badge, Modal } from 'react-bootstrap';
import { Search, EyeFill, CalendarPlus, CheckCircleFill, XCircleFill, ChatQuote, CalendarWeek, JournalCheck } from 'react-bootstrap-icons';
import { format } from 'date-fns';

import { Appointment, CustomTailoringItem, MeasurementRef, RentalOrder, UnavailabilityRecord } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { CancellationReasonModal } from '../../components/modals/cancellationReasonModal/CancellationReasonModal';
import CreateEditCustomItemModal from '../../components/modals/createEditCustomItemModal/CreateEditCustomItemModal';
import { DayBlockPicker } from '../../components/dayBlockPicker/DayBlockPicker'; 
import CustomPagination from '../../components/customPagination/CustomPagination';

type TabStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
type BlockType = 'morning' | 'afternoon' | '';

function ManageAppointments() {
  const { addAlert } = useAlert();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabStatus>('Pending');
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [isSaving, setIsSaving] = useState(false);
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleData, setRescheduleData] = useState<{ date: Date | null; block: BlockType }>({ date: null, block: '' });
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);

  useEffect(() => {
    const state = location.state as { searchTerm?: string; activeTab?: TabStatus };

    if (state) {
      if (state.searchTerm) {
        setSearchTerm(state.searchTerm);
      }
      if (state.activeTab) {
        setActiveTab(state.activeTab);
      }

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [appointmentsRes, refsRes, unavailableRes] = await Promise.all([
          // Pass the current page to the API
          api.get('/appointments', {
            params: {
              page: currentPage,
              limit: ITEMS_PER_PAGE
            }
          }),
          api.get('/measurementrefs'),
          api.get('/unavailability') 
        ]);
        // The response is now an object, so we access the 'appointments' array
        setAllAppointments(appointmentsRes.data.appointments || []);
        setTotalPages(appointmentsRes.data.totalPages || 1);

        setMeasurementRefs(refsRes.data || []);
        setUnavailableDates(unavailableRes.data.map((rec: UnavailabilityRecord) => new Date(rec.date)));
      } catch (err) {
        setError("Failed to load appointment data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, activeTab]);

  const getStatusBadgeVariant = (status: Appointment['status']): BadgeVariant => {
    switch (status) {
      case 'Pending': return 'primary';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const filteredAppointments = useMemo(() => {
    return allAppointments.filter(appointment => {
      if (!appointment || !appointment.status) return false;

      const tabMatch = appointment.status === activeTab;

      if (searchTerm.trim()) {
        const lowercasedSearch = searchTerm.toLowerCase();
        return (
          appointment.customerInfo?.name?.toLowerCase().includes(lowercasedSearch) ||
          appointment._id.toLowerCase().includes(lowercasedSearch) ||
          appointment.customerInfo?.phoneNumber?.includes(lowercasedSearch)
        );
      }

      // If no search term, just filter by the active tab.
      return tabMatch;
    });
  }, [allAppointments, activeTab, searchTerm]);

  const handleOpenRescheduleModal = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    // --- (2) SET the new state object ---
    setRescheduleData({
      date: appointment.appointmentDate ? new Date(appointment.appointmentDate) : null,
      block: appointment.timeBlock as BlockType
    });
    setShowRescheduleModal(true);
  };
  
  const handleConfirmReschedule = async () => {
    if (!currentAppointment || !rescheduleData.date || !rescheduleData.block) {
      addAlert('Please select a new date and time block.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const response = await api.put(`/appointments/${currentAppointment._id}`, {
        appointmentDate: rescheduleData.date,
        timeBlock: rescheduleData.block
      });
      setAllAppointments(prev => prev.map(apt => apt._id === currentAppointment._id ? response.data : apt));
      addAlert('Appointment rescheduled successfully!', 'success');
      setShowRescheduleModal(false);
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to reschedule.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: Appointment['status'], successMessage: string) => {
    setIsSaving(true);
    try {
      const response = await api.put(`/appointments/${appointmentId}`, { status: newStatus });
      setAllAppointments(prev => prev.map(apt => apt._id === appointmentId ? response.data : apt));
      addAlert(successMessage, 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || `Failed to update appointment.`, 'danger');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleOpenCancelModal = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setShowCancelModal(true);
  };
  
  const handleConfirmCancellation = async (reason: string) => {
    if (!currentAppointment) return;
    setIsSaving(true);
    try {
      const response = await api.put(`/appointments/${currentAppointment._id}/cancel`, { reason });
      setAllAppointments(prev => prev.map(apt => apt._id === currentAppointment._id ? response.data : apt));
      addAlert('Appointment successfully cancelled.', 'success');
      setShowCancelModal(false);
    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to cancel appointment.", 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCreateRentalModal = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setShowCustomItemModal(true);
  };

  const handleSaveCustomItemAndCreateRental = async (itemData: CustomTailoringItem) => {
    if (!currentAppointment) return;

    setIsSaving(true);
    try {
        // Step 1: Create the rental payload
        const rentalPayload = {
            customerInfo: [currentAppointment.customerInfo],
            customTailoring: [itemData]
        };
        addAlert('Creating rental record...', 'info');
        const rentalResponse = await api.post('/rentals', rentalPayload);
        const newRental: RentalOrder = rentalResponse.data;
        addAlert(`Rental ${newRental._id} created...`, 'success');

        // Step 2: Update the original appointment to be 'Completed' and link the new rentalId
        // This is now a single, efficient API call.
        const updatedAppointment = await api.put(`/appointments/${currentAppointment._id}`, {
            status: 'Completed',
            rentalId: newRental._id
        });
        
        // Step 3: Update local state, close modal, and redirect
        setAllAppointments(prev => prev.map(apt => apt._id === currentAppointment._id ? updatedAppointment.data : apt));
        setShowCustomItemModal(false);
        
        addAlert('Redirecting to new rental...', 'info');
        setTimeout(() => navigate(`/rentals/${newRental._id}`), 1500);

    } catch (err: any) {
        addAlert(err.response?.data?.message || "Failed to create rental.", 'danger');
    } finally {
        setIsSaving(false);
    }
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    return (
      <Card key={appointment._id} className="mb-2 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light">
          <div>
            <strong>ID: {appointment._id}</strong>
            <small className="text-muted ms-2">(Created: {format(new Date(appointment.createdAt), 'MMM dd, yyyy, h:mm a')})</small>
          </div>
          <Badge bg={getStatusBadgeVariant(appointment.status)} pill>{appointment.status.toUpperCase()}</Badge>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={7}>
              {/* Customer Info Section */}
              <p className="mb-1"><span className='fw-semibold'>Customer:</span> {appointment.customerInfo.name}</p>
              <p className="mb-1 small"><span className='fw-semibold'>Contact:</span> {appointment.customerInfo.phoneNumber}</p>
              <p className="mb-1 small"><span className='fw-semibold'>Email:</span> {appointment.customerInfo.email || 'N/A'}</p>
              <p className="mb-1 small"><span className='fw-semibold'>Address:</span> {`${appointment.customerInfo.address.street}, ${appointment.customerInfo.address.barangay}, ${appointment.customerInfo.address.city}`}</p>
              
              <hr className="my-2"/>
              
              {/* Appointment Details Section */}
              <p className="mb-1">
                <span className='fw-semibold'>Schedule:</span> 
                {appointment.appointmentDate 
                  ? `${format(new Date(appointment.appointmentDate), 'MMM dd, yyyy')}${
                      appointment.timeBlock 
                        ? `, ${appointment.timeBlock.charAt(0).toUpperCase() + appointment.timeBlock.slice(1)}` 
                        : ''
                    }`
                  : 'N/A'
                }
              </p>
              <p className="mb-0 small"><ChatQuote className="me-1"/> <span>Notes:</span> {appointment.notes?.trim() ? `"${appointment.notes}"` : 'None'}</p>
              {appointment.sourceReservationId && (
                <div className="mt-2">
                  <Badge bg="light" text="dark" className="p-2">
                    <JournalCheck className="me-2" />
                    Linked to Reservation: 
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="p-0 ps-1 text-decoration-underline"
                      onClick={() => navigate(`/reservations/${appointment.sourceReservationId}`)}
                    >
                      {appointment.sourceReservationId}
                    </Button>
                  </Badge>
                </div>
              )}
            </Col>
            <Col md={5} className="text-md-end d-flex flex-column justify-content-center align-items-md-end">
              {/* Add a wrapper div with d-grid to make buttons fill the width */}
              <div className="d-grid gap-2 w-100" style={{ maxWidth: '200px' }}>
                {appointment.status === 'Pending' && (
                  <>
                    <Button size="sm" variant="success" onClick={() => handleUpdateStatus(appointment._id, 'Confirmed', 'Appointment Confirmed!')} disabled={isSaving}>
                      <CheckCircleFill className="me-2"/>Confirm
                    </Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => handleOpenRescheduleModal(appointment)} disabled={isSaving}>
                      <CalendarWeek className="me-2"/>Reschedule
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => handleOpenCancelModal(appointment)} disabled={isSaving}>
                      <XCircleFill className="me-2"/>Cancel
                    </Button>
                  </>
                )}
                {appointment.status === 'Confirmed' && (
                  <>
                    <Button size="sm" variant="primary" onClick={() => handleOpenCreateRentalModal(appointment)} disabled={isSaving}>
                        Create Rental
                    </Button>
                    <Button size="sm" variant="outline-secondary" onClick={() => handleOpenRescheduleModal(appointment)} disabled={isSaving}>
                      <CalendarWeek className="me-2"/>Reschedule
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => handleOpenCancelModal(appointment)} disabled={isSaving}>
                      <XCircleFill className="me-2"/>Cancel
                    </Button>
                  </>
                )}
                {appointment.status === 'Completed' && appointment.rentalId && (
                  <Button size="sm" variant="outline-success" onClick={() => navigate(`/rentals/${appointment.rentalId}`)}>
                    <EyeFill className="me-2"/>View Rental
                  </Button>
                )}
                {appointment.status === 'Cancelled' && appointment.cancellationReason && (
                  <p className="small fst-italic mb-0"><span className='fw-semibold'>Cancellation Reason:</span> "{appointment.cancellationReason}"</p>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };


  return (
    <div style={{minHeight: "100vh", paddingTop: '1rem', paddingBottom: '1rem' }}>
      <Container fluid="lg">
        <Card className="shadow-sm">
          <Card.Header className="bg-white border-bottom-0 pt-3 px-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center">
              <h2 className="mb-0">Appointments Manager</h2>
              <div className="d-flex align-items-center gap-2">
                <InputGroup style={{ maxWidth: '400px' }}>
                  <InputGroup.Text><Search /></InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="Search by Customer, ID, or Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                <Button variant="danger" onClick={() => navigate('/appointments/new')}>
                  <CalendarPlus className="me-2"/> New Appointment
                </Button>
              </div>
            </div>
          </Card.Header>
          <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k as TabStatus)} className="px-3 pt-2">
            <Nav.Item><Nav.Link eventKey="Pending">Pending</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Confirmed">Confirmed</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Completed">Completed</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Cancelled">Cancelled</Nav.Link></Nav.Item>
          </Nav>
          <Card.Body className="p-4">
            {loading ? (
              <div className="text-center py-5"><Spinner /><p className="mt-2">Loading Appointments...</p></div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : filteredAppointments.length === 0 ? (
              <Alert variant="info" className="text-center">
                {searchTerm.trim()
                  ? `No appointments match your search.`
                  : `No appointments with "${activeTab}" status.`
                }
              </Alert>
            ) : (
              filteredAppointments.map(renderAppointmentCard)
            )}
          </Card.Body>
          <Card.Footer className="bg-white">
            {!loading && totalPages > 1 && (
              <CustomPagination
                active={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            )}
          </Card.Footer>
        </Card>
      </Container>

      <Modal show={showRescheduleModal} onHide={() => setShowRescheduleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reschedule Appointment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DayBlockPicker
            selectedDate={rescheduleData.date}
            selectedBlock={rescheduleData.block}
            onChange={(date, block) => setRescheduleData({ date, block })}
            minDate={new Date()}
            unavailableDates={unavailableDates}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</Button>
          <Button 
            variant="primary" 
            onClick={handleConfirmReschedule} 
            disabled={!rescheduleData.date || !rescheduleData.block || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save New Schedule'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {currentAppointment && (
        <>
          <CancellationReasonModal
            show={showCancelModal}
            onHide={() => setShowCancelModal(false)}
            onConfirm={handleConfirmCancellation}
            title="Confirm Appointment Cancellation"
            itemType="appointment"
            itemId={currentAppointment._id}
          />
          <CreateEditCustomItemModal
            show={showCustomItemModal}
            onHide={() => setShowCustomItemModal(false)}
            item={null} // Always in "create" mode
            itemName={`Custom Item for ${currentAppointment.customerInfo.name}`}
            measurementRefs={measurementRefs}
            onSave={handleSaveCustomItemAndCreateRental}
            isForPackage={false}
            uploadMode="immediate"
            initialFittingDate={currentAppointment.appointmentDate}
          />
        </>
      )}
    </div>
  );
}

export default ManageAppointments;