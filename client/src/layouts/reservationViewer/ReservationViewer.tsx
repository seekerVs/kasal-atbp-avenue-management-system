// client/src/layouts/reservationViewer/ReservationViewer.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert, Breadcrumb, Card, Badge, Button } from 'react-bootstrap';
import { format } from 'date-fns';

import { Appointment, Reservation } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';

// We will reuse some components from the old booking system for display
import { ReservationItemsList } from '../../components/reservationItemsList/ReservationItemsList';//
import { PersonFill, CalendarEvent, GeoAltFill } from 'react-bootstrap-icons';
import { LinkedAppointmentsList } from '../../components/linkedAppointmentsList/LinkedAppointmentsList';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

function ReservationViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [linkedAppointments, setLinkedAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!id) return;
    const fetchFullReservationDetails = async () => {
      setLoading(true);
      setError(null);
      setLinkedAppointments([]); // Reset on each load

      try {
        // Fetch the main reservation data
        const res = await api.get(`/reservations/${id}`);
        const fetchedReservation: Reservation = res.data;
        setReservation(fetchedReservation);

        // Find all linked appointment IDs from the reservation data
        const appointmentIds = (fetchedReservation.packageReservations || [])
          .flatMap(pkg => pkg.fulfillmentPreview)
          .map(fulfillment => fulfillment.linkedAppointmentId)
          .filter((id): id is string => !!id); // Filter out any null/undefined IDs

        // If there are linked appointments, fetch them all
        if (appointmentIds.length > 0) {
          const appointmentPromises = appointmentIds.map(aptId => api.get(`/appointments/${aptId}`));
          const appointmentResponses = await Promise.all(appointmentPromises);
          const appointments = appointmentResponses.map(response => response.data);
          setLinkedAppointments(appointments);
        }

      } catch (err) {
        setError("Failed to load reservation details.");
      } finally {
        setLoading(false);
      }
    };
    fetchFullReservationDetails();
  }, [id]);

  const handleConfirmAndCreateRental = async () => {
    if (!reservation) return;

    setIsSaving(true);
    try {
      // Call the new backend endpoint
      const response = await api.post('/rentals/from-reservation', {
        reservationId: reservation._id
      });
      const newRental = response.data;

      addAlert(`Successfully created Rental ID: ${newRental._id}`, 'success');

      // Update the local reservation status for immediate UI feedback
      setReservation(prev => prev ? { ...prev, status: 'Completed', rentalId: newRental._id } : null);

      // Redirect the user to the new rental page after a short delay
      setTimeout(() => {
        navigate(`/rentals/${newRental._id}`);
      }, 2000);

    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to create rental from reservation.", 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeVariant = (status: Reservation['status']): BadgeVariant => {
    switch (status) {
      case 'Pending': return 'primary';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };
  
  if (loading) {
    return <Container className="text-center py-5"><Spinner /></Container>;
  }
  if (error) {
    return <Container><Alert variant="danger">{error}</Alert></Container>;
  }
  if (!reservation) {
    return <Container><Alert variant="info">Reservation data not found.</Alert></Container>;
  }

  const canBeConverted = reservation.status === 'Pending' || reservation.status === 'Confirmed';

  return (
    <Container fluid>
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => navigate('/manage-reservations')}>Reservations Manager</Breadcrumb.Item>
        <Breadcrumb.Item active>View Reservation</Breadcrumb.Item>
      </Breadcrumb>
      <h2 className="mb-4">Reservation Details: {reservation._id}</h2>
      
      <Row className="g-4">
        {/* Left Column: Customer and Event Info */}
        <Col lg={4}>
          <Card className="shadow-sm">
            <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
              <span>Reservation Info</span>
              <Badge bg={getStatusBadgeVariant(reservation.status)} pill>{reservation.status}</Badge>
            </Card.Header>
            <Card.Body>
              <p className="mb-1"><PersonFill className="me-2 text-muted"/><strong>Customer:</strong> {reservation.customerInfo.name}</p>
              <p className="mb-1"><span className="text-muted small"><strong>Contact:</strong> {reservation.customerInfo.phoneNumber} | {reservation.customerInfo.email || 'N/A'}</span></p>
              <p className="mb-3"><GeoAltFill className="me-2 text-muted"/>
                <span className="text-muted small"><strong>Address:</strong> {`${reservation.customerInfo.address.street}, ${reservation.customerInfo.address.barangay}, ${reservation.customerInfo.address.city}`}</span>
              </p>
              <hr />
              <p className="mb-1"><CalendarEvent className="me-2 text-muted"/><strong>Event Date:</strong> {format(new Date(reservation.eventDate), 'MMMM dd, yyyy')}</p>
              <p className="mb-0"><span className="text-muted small"><strong>Rental Period:</strong> {format(new Date(reservation.reserveStartDate), 'MMM dd')} - {format(new Date(reservation.reserveEndDate), 'MMM dd, yyyy')}</span></p>
              
              {canBeConverted && (
                <div className="d-grid mt-4">
                    <Button variant="danger" onClick={handleConfirmAndCreateRental} disabled={isSaving}>
                    {isSaving ? <Spinner as="span" size="sm" /> : 'Confirm & Create Rental'}
                    </Button>
                </div>
                )}

                {reservation.status === 'Completed' && reservation.rentalId && (
                    <Alert variant="success" className="mt-4 text-center">
                        <p className="mb-1 fw-bold">Reservation Completed</p>
                        <Button variant="link" size="sm" onClick={() => navigate(`/rentals/${reservation.rentalId}`)}>
                            View Rental: {reservation.rentalId}
                        </Button>
                    </Alert>
                )}

            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: Reserved Items */}
        <Col lg={8}>
          <ReservationItemsList items={reservation.itemReservations} packages={reservation.packageReservations} />
          {linkedAppointments.length > 0 && (
            <LinkedAppointmentsList appointments={linkedAppointments} />
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default ReservationViewer;