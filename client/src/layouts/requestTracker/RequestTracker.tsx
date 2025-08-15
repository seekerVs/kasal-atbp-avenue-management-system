import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { Search, PersonFill, CalendarEvent, CardText } from 'react-bootstrap-icons';
import api from '../../services/api';
import { Reservation, Appointment } from '../../types';
import CustomFooter from '../../components/customFooter/CustomFooter';
import { format } from 'date-fns';
import { StatusTimeline } from '../../components/statusTimeline/StatusTimeline';
// --- 1. REMOVE THE ReservationItemsList IMPORT ---
// import { ReservationItemsList } from '../../components/reservationItemsList/ReservationItemsList';
import './requestTracker.css';
import TrackerBackgroundImage from '../../assets/images/tracker_image.jpg';

type SearchResult = 
  | { type: 'reservation'; data: Reservation }
  | { type: 'appointment'; data: Appointment }
  | null;

function RequestTracker() {
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) {
      setError('Please enter a valid ID.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSearchResult(null);

    try {
      const response = await api.get(`/track/${searchId.trim()}`);
      setSearchResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

    const renderSearchResult = () => {
    if (!searchResult) return null;

    if (searchResult.type === 'reservation') {
      const reservation = searchResult.data;
      const steps = ['Pending', 'Confirmed', 'Completed'];
      const getStatusBadgeVariant = (status: Reservation['status']) => {
        const variants = { Pending: 'danger', Confirmed: 'info', Completed: 'success', Cancelled: 'secondary' };
        return variants[status] || 'secondary';
      };

      return (
        <div className="text-center">
          <h4 className="mb-0">Status for Reservation:</h4>
          <p className="h5 fw-bold text-danger mb-2">{reservation._id}</p>
          <Badge bg={getStatusBadgeVariant(reservation.status)} className="mb-3">{reservation.status}</Badge>

          <StatusTimeline steps={steps} currentStatus={reservation.status} />
          
          <Alert variant="info" className="text-center small py-2 my-4">
            {reservation.status === 'Pending' && "Our staff is reviewing your request. Please check back later for updates."}
            {reservation.status === 'Confirmed' && "Your reservation is confirmed! We look forward to seeing you."}
            {reservation.status === 'Completed' && `This reservation has been completed and converted to Rental ID: ${reservation.rentalId || 'N/A'}.`}
          </Alert>
          
          {/* --- 3. ADD CONDITIONAL DISPLAY FOR CANCELLATION REASON --- */}
          {reservation.status === 'Cancelled' && reservation.cancellationReason && (
            <Alert variant="danger" className="text-start">
              <Alert.Heading as="h6">Cancellation Reason</Alert.Heading>
              <p className="mb-0 fst-italic">"{reservation.cancellationReason}"</p>
            </Alert>
          )}
        </div>
      );
    }

    if (searchResult.type === 'appointment') {
      const appointment = searchResult.data;
      const steps = ['Pending', 'Confirmed', 'Completed'];
       const getStatusBadgeVariant = (status: Appointment['status']) => {
        const variants = { Pending: 'danger', Confirmed: 'info', Completed: 'success', Cancelled: 'secondary', 'No Show': 'warning' };
        return variants[status] || 'secondary';
      };

      return (
        <div className="text-center">
          <h4 className="mb-0">Status for Appointment:</h4>
          <p className="h5 fw-bold text-danger mb-2">{appointment._id}</p>
          <Badge bg={getStatusBadgeVariant(appointment.status)} className="mb-3">{appointment.status}</Badge>

          <StatusTimeline steps={steps} currentStatus={appointment.status} />

          <Alert variant="info" className="text-center small">
            {appointment.status === 'Pending' && "Our staff will contact you shortly to confirm your schedule."}
            {appointment.status === 'Confirmed' && "Your appointment is confirmed! Please arrive on time."}
            {appointment.status === 'Completed' && `This appointment has been completed. Rental ID: ${appointment.rentalId || 'N/A'}.`}
            {appointment.status === 'Cancelled' && "This appointment has been cancelled."}
            {appointment.status === 'No Show' && "This appointment was marked as a no-show."}
          </Alert>

          <Card>
            <Card.Body className="text-start">
                <p className="mb-2"><PersonFill className="me-2"/><strong>Customer:</strong> {appointment.customerInfo.name}</p>
                <p className="mb-2">
                  <CalendarEvent className="me-2"/><strong>Date:</strong> {
                    appointment.appointmentDate
                      ? format(new Date(appointment.appointmentDate), 'MMMM dd, yyyy @ h:mm a')
                      : 'Not Scheduled'
                  }
                </p>
                {appointment.statusNote && <p className="mb-0"><CardText className="me-2"/><strong>Notes:</strong> {appointment.statusNote}</p>}
            </Card.Body>
          </Card>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="tracker-page-wrapper" style={{ backgroundImage: `url(${TrackerBackgroundImage})` }}>
      <div className="tracker-content-container">
          <Row className="justify-content-center">
            <Col md={8} lg={8}>
              <Card className="shadow-sm">
                <Card.Body className={!searchResult ? "p-4 p-md-5" : "p-4"}>

                  {!searchResult ? (
                    <div className="text-center">
                      <h2 className="mb-3">Track Your Request</h2>
                      <p className="text-muted mb-4">
                        Enter your Reservation ID or Appointment ID to check the latest status.
                      </p>
                      <Form onSubmit={handleSearch}>
                        <Form.Group>
                          <Form.Control
                            type="text"
                            placeholder="e.g., RES-ABC123"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            className="text-center"
                            isInvalid={!!error}
                          />
                          <Form.Control.Feedback type="invalid">
                            {error}
                          </Form.Control.Feedback>
                        </Form.Group>
                        <div className="d-grid mt-3">
                          <Button type="submit" disabled={isLoading}>
                            {isLoading ? <Spinner as="span" size="sm" /> : <Search className="me-2"/>}
                            Track
                          </Button>
                        </div>
                      </Form>
                    </div>
                  ) : (
                    <div>
                      {renderSearchResult()}
                      <div className="mt-4 text-center">
                          <Button variant="link" onClick={() => { setSearchResult(null); setError(null); setSearchId(''); }}>
                              Search for another ID
                          </Button>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
      </div>
      <footer className="bg-white text-dark py-3 border-top"><CustomFooter /></footer>
    </div>
  );
}

export default RequestTracker;