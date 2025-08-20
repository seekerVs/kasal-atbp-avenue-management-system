// client/src/layouts/manageAppointments/ManageAppointments.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Nav, Spinner, Alert, InputGroup, Form, Button, Row, Col, Badge } from 'react-bootstrap';
import { Search, EyeFill, CalendarPlus } from 'react-bootstrap-icons';
import { format } from 'date-fns';

import { Appointment } from '../../types';
import api from '../../services/api';

type TabStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

function ManageAppointments() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabStatus>('Pending');
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/appointments');
        setAllAppointments(response.data || []);
      } catch (err) {
        setError("Failed to load appointments. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

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

  const renderAppointmentCard = (appointment: Appointment) => {
    return (
      <Card key={appointment._id} className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light">
          <div>
            <strong>Appointment ID: {appointment._id}</strong>
            <small className="text-muted ms-2">(Date: {appointment.appointmentDate ? format(new Date(appointment.appointmentDate), 'MMM dd, yyyy, h:mm a') : 'N/A'})</small>
          </div>
          <Badge bg={getStatusBadgeVariant(appointment.status)} pill>{appointment.status.toUpperCase()}</Badge>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={8}>
              <p className="mb-1"><strong>Customer:</strong> {appointment.customerInfo.name}</p>
              <p className="mb-0 text-muted small"><strong>Contact:</strong> {appointment.customerInfo.phoneNumber}</p>
            </Col>
            <Col md={4} className="text-md-end">
              <Button
                variant="outline-primary"
                size="sm"
                className="mt-2"
                onClick={() => navigate(`/appointments/${appointment._id}`)}
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
        </Card>
      </Container>
    </div>
  );
}

export default ManageAppointments;