import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert, Breadcrumb } from 'react-bootstrap';

import { Booking, Appointment } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';

import { BookingInfoCard } from '../../components/booking/BookingInfoCard';
import { BookingReservationsList } from '../../components/booking/BookingReservationsList';
import { BookingAppointmentsList } from '../../components/booking/BookingAppointmentsList';
import { ProcessAppointmentModal } from '../../components/modals/processAppointmentModal/ProcessAppointmentModal';
import { AddToRentalModal } from '../../components/modals/addToRentalModal/AddToRentalModal';

function BookingViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [appointmentToProcess, setAppointmentToProcess] = useState<Appointment | null>(null);
  const [showAddToRentalModal, setShowAddToRentalModal] = useState(false);
  const [appointmentToAdd, setAppointmentToAdd] = useState<Appointment | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchBooking = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/bookings/${id}`);
        setBooking(response.data);
      } catch (err) {
        setError("Failed to load booking details.");
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [id]);

  const handleStatusChange = async (status: 'Confirmed' | 'Cancelled') => {
    if (!booking) return;
    setIsSaving(true);
    try {
      const response = await api.put(`/bookings/${booking._id}`, { status });
      setBooking(response.data);
      addAlert(`Booking status updated to ${status}.`, 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to update status.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleProcessAppointment = (appointment: Appointment) => {
    setAppointmentToProcess(appointment);
    setShowProcessModal(true);
  };

  const handleAddToRentalSuccess = (rentalId: string) => {
    setShowAddToRentalModal(false);
    addAlert('Item successfully added to rental! Redirecting...', 'success');
    // We should also update the booking status to 'Completed' in a real app,
    // which the backend should handle. For now, just redirect.
    setTimeout(() => {
        navigate(`/rentals/${rentalId}`);
    }, 2000);
  };
  
  const handleAddToRental = (appointment: Appointment) => {
    if (!appointment.processedItemData) {
        addAlert('This appointment does not have processed item data to add.', 'danger');
        return;
    }
    setAppointmentToAdd(appointment);
    setShowAddToRentalModal(true);
  };

  const handleSaveAppointment = (updatedBooking: Booking) => {
    setBooking(updatedBooking); // Update the main page's state with the new data from the modal
  };

  if (loading) {
    return <Container className="text-center py-5"><Spinner /></Container>;
  }
  if (error) {
    return <Container><Alert variant="danger">{error}</Alert></Container>;
  }
  if (!booking) {
    return <Container><Alert variant="info">Booking data not found.</Alert></Container>;
  }

  return (
    <Container fluid>
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => navigate('/bookings')}>Bookings Manager</Breadcrumb.Item>
        <Breadcrumb.Item active>View Booking</Breadcrumb.Item>
      </Breadcrumb>
      <h2 className="mb-4">Booking Details: {booking._id}</h2>
      
      <Row className="g-4">
        <Col lg={4}>
          <BookingInfoCard booking={booking} onStatusChange={handleStatusChange} isSaving={isSaving} />
        </Col>
        <Col lg={8}>
          <BookingReservationsList items={booking.itemReservations} packages={booking.packageReservations} />
          {booking.appointments && booking.appointments.length > 0 && (
            <BookingAppointmentsList
              appointments={booking.appointments}
              onProcessAppointment={handleProcessAppointment}
              onAddToRental={handleAddToRental}
            />
          )}
        </Col>
      </Row>

      {showAddToRentalModal && appointmentToAdd && (
        <AddToRentalModal
          show={showAddToRentalModal}
          onHide={() => setShowAddToRentalModal(false)}
          appointment={appointmentToAdd}
          customerPhoneNumber={booking.customerInfo.phoneNumber}
          onSuccess={handleAddToRentalSuccess}
        />
      )}
      
      {showProcessModal && appointmentToProcess && (
        <ProcessAppointmentModal
          show={showProcessModal}
          onHide={() => setShowProcessModal(false)}
          appointment={appointmentToProcess}
          bookingId={booking._id}
          onSave={handleSaveAppointment}
        />
      )}
    </Container>
  );
}

export default BookingViewer;