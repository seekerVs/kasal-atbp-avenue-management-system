// client/src/layouts/manageReservations/ManageReservations.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Nav, Spinner, Alert, InputGroup, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import { Search, EyeFill } from 'react-bootstrap-icons';
import { format } from 'date-fns';

import { Reservation } from '../../types';
import api from '../../services/api';

type TabStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'All';
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

function ManageReservations() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabStatus>('Pending');
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchReservations = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/reservations');
        setAllReservations(response.data || []);
      } catch (err) {
        setError("Failed to load reservations. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchReservations();
  }, []);

  const getStatusBadgeVariant = (status: Reservation['status']): BadgeVariant => {
    switch (status) {
      case 'Pending': return 'primary';
      case 'Confirmed': return 'info';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const filteredReservations = useMemo(() => {
    return allReservations.filter(reservation => {
      if (!reservation || !reservation.status) return false;

      const tabMatch = activeTab === 'All' ? true : reservation.status === activeTab;
      if (!tabMatch) return false;

      if (!searchTerm.trim()) return true;
      const lowercasedSearch = searchTerm.toLowerCase();

      return (
        reservation.customerInfo?.name?.toLowerCase().includes(lowercasedSearch) ||
        reservation._id.toLowerCase().includes(lowercasedSearch) ||
        reservation.customerInfo?.phoneNumber?.includes(lowercasedSearch)
      );
    });
  }, [allReservations, activeTab, searchTerm]);

  const renderReservationCard = (reservation: Reservation) => {
    const totalItems = (reservation.itemReservations?.length || 0) + (reservation.packageReservations?.length || 0);

    return (
      <Card key={reservation._id} className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light">
          <div>
            <strong>Reservation ID: {reservation._id}</strong>
            <small className="text-muted ms-2">(Event: {format(new Date(reservation.eventDate), 'MMM dd, yyyy')})</small>
          </div>
          <Badge bg={getStatusBadgeVariant(reservation.status)} pill>{reservation.status.toUpperCase()}</Badge>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={8}>
              <p className="mb-1"><strong>Customer:</strong> {reservation.customerInfo.name}</p>
              <p className="mb-0 text-muted small"><strong>Contact:</strong> {reservation.customerInfo.phoneNumber}</p>
            </Col>
            <Col md={4} className="text-md-end">
              <p className="mb-1"><strong>Total Items/Packages:</strong> {totalItems}</p>
              <Button
                variant="outline-primary"
                size="sm"
                className="mt-2"
                onClick={() => navigate(`/reservations/${reservation._id}`)}
              >
                <EyeFill className="me-2" /> View Details
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div style={{ backgroundColor: "#F8F9FA", minHeight: "100vh", paddingTop: '1rem', paddingBottom: '1rem' }}>
      <Container fluid="lg">
        <Card className="shadow-sm">
          <Card.Header className="bg-white border-bottom-0 pt-3 px-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center">
              <h2 className="mb-0">Reservations Manager</h2>
              <InputGroup style={{ maxWidth: '400px' }}>
                <InputGroup.Text><Search /></InputGroup.Text>
                <Form.Control
                  type="search"
                  placeholder="Search by Customer, ID, or Phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </div>
          </Card.Header>
          <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k as TabStatus)} className="px-3 pt-2">
            <Nav.Item><Nav.Link eventKey="All">All</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Pending">Pending</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Confirmed">Confirmed</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Completed">Completed</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Cancelled">Cancelled</Nav.Link></Nav.Item>
          </Nav>
          <Card.Body className="p-4">
            {loading ? (
              <div className="text-center py-5"><Spinner /><p className="mt-2">Loading Reservations...</p></div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : filteredReservations.length === 0 ? (
              <Alert variant="info" className="text-center">
                {searchTerm.trim()
                  ? `No reservations match your search.`
                  : `No reservations with "${activeTab}" status.`
                }
              </Alert>
            ) : (
              filteredReservations.map(renderReservationCard)
            )}
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}

export default ManageReservations;