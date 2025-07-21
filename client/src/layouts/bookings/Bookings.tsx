import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Nav, Card, Badge, Spinner, Alert, InputGroup, Form, Button } from 'react-bootstrap';
import { CalendarEvent, EyeFill, Search, CalendarPlus } from 'react-bootstrap-icons';
import { format } from 'date-fns';

import { Booking } from '../../types';
import api from '../../services/api';

type TabStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'All';
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function Bookings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabStatus>('Pending');
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/bookings');
        setAllBookings(response.data || []);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError("Failed to load bookings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const getStatusBadgeVariant = (status: Booking['status']): BadgeVariant => {
    switch (status) {
      case 'Pending': return 'primary';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const filteredBookings = allBookings.filter(booking => {
    if (!booking || !booking.status) {
      return false;
    }
    
    const tabMatch = activeTab === 'All' ? true : booking.status === activeTab;
    if (!tabMatch) return false;

    if (!searchTerm.trim()) return true;
    const lowercasedSearch = searchTerm.toLowerCase();

    const customerName = booking.customerInfo?.name?.toLowerCase() || '';
    const bookingId = booking._id.toLowerCase();
    const customerPhone = booking.customerInfo?.phoneNumber || '';

    return (
      customerName.includes(lowercasedSearch) ||
      bookingId.includes(lowercasedSearch) ||
      customerPhone.includes(lowercasedSearch)
    );
  });

  const renderBookingCard = (booking: Booking) => {
    const customer = booking.customerInfo || {};
    const totalItems = (booking.itemReservations?.length || 0) + (booking.packageReservations?.length || 0);
    const totalAppointments = booking.appointments?.length || 0;
    const status = booking.status || 'Pending'; 

    return (
      <Card key={booking._id} className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light border-bottom">
          <div>
            <strong className="me-2">Booking ID: {booking._id}</strong>
            <small className="text-muted">(Event: {format(new Date(booking.eventDate), 'MMM dd, yyyy')})</small>
          </div>
          <Badge bg={getStatusBadgeVariant(status)} pill>{status.toUpperCase()}</Badge>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="mb-3">
            <Col>
              <p className="mb-1"><strong>Customer:</strong> {customer.name}</p>
              <p className="mb-0 text-muted small"><strong>Contact:</strong> {customer.phoneNumber}</p>
            </Col>
            <Col className="text-end">
                <p className="mb-1"><strong>Items Reserved:</strong> {totalItems}</p>
                <p className="mb-0"><strong>Appointments:</strong> {totalAppointments}</p>
            </Col>
          </Row>
          <hr />
          <div className="d-flex justify-content-end align-items-center">
            <Button
              variant="outline-primary"
              // --- THIS IS THE KEY NAVIGATION ---
              onClick={() => navigate(`/bookings/${booking._id}`)}
            >
              <EyeFill className="me-2" /> View Details
            </Button>
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div style={{ backgroundColor: "#F8F9FA", minHeight: "100vh", paddingTop: '1rem', paddingBottom: '1rem' }}>
      <Container fluid="lg">
        <Card className="shadow-sm overflow-hidden">
          <Card.Header className="bg-white border-bottom-0 pt-3 px-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center">
              <h2 className="mb-0">Bookings Manager</h2>
              <div className="d-flex align-items-center gap-2">
                <InputGroup style={{ maxWidth: '400px' }}>
                  <InputGroup.Text><Search /></InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="Search by Customer, Booking ID, or Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                {/* Note: An admin might also want a "New Booking" button here, 
                    but the sidebar link is sufficient for now. */}
              </div>
            </div>
          </Card.Header>
          <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k as TabStatus)} className="px-3 pt-2">
            <Nav.Item><Nav.Link eventKey="All">All</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Pending">Pending</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Confirmed">Confirmed</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Completed">Completed</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Cancelled">Cancelled</Nav.Link></Nav.Item>
          </Nav>
          <div className="p-4">
            {loading ? (
              <div className="text-center py-5"><Spinner animation="border" /><p className="mt-2">Loading Bookings...</p></div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : filteredBookings.length === 0 ? (
              <Alert variant="info" className="m-3 text-center">
                {searchTerm.trim()
                  ? `No bookings match your search for "${searchTerm}" in this tab.`
                  : `No bookings found for the "${activeTab}" status.`
                }
              </Alert>
            ) : (
              filteredBookings.map(renderBookingCard)
            )}
          </div>
        </Card>
      </Container>
    </div>
  );
}

export default Bookings;