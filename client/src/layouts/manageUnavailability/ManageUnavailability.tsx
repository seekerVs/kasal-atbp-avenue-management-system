import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { Trash, CalendarPlus } from 'react-bootstrap-icons';
import { format } from 'date-fns';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';

interface UnavailabilityRecord {
  _id: string;
  date: string;
  reason: string;
}

function ManageUnavailability() {
  const { addAlert } = useAlert();
  const [unavailableDates, setUnavailableDates] = useState<UnavailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the "Add New" form
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUnavailableDates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/unavailability');
      setUnavailableDates(response.data || []);
    } catch (err) {
      setError('Failed to load unavailability schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnavailableDates();
  }, []);

  const handleAddDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate || !newReason) {
      addAlert('Both date and reason are required.', 'warning');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/unavailability', { date: newDate, reason: newReason });
      addAlert(`Date ${format(new Date(newDate), 'MM/dd/yyyy')} added successfully.`, 'success');
      setNewDate('');
      setNewReason('');
      fetchUnavailableDates(); // Refresh the list
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to add date.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDate = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this date?')) return;

    try {
      await api.delete(`/unavailability/${id}`);
      addAlert('Date removed successfully.', 'success');
      fetchUnavailableDates(); // Refresh the list
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to remove date.', 'danger');
    }
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Manage Shop Unavailability</h2>
      <Row>
        <Col lg={5}>
          <Card className="shadow-sm">
            <Card.Header as="h5"><CalendarPlus className="me-2"/>Add an Unavailable Date</Card.Header>
            <Card.Body>
              <Form onSubmit={handleAddDate}>
                <Form.Group className="mb-3">
                  <Form.Label>Date</Form.Label>
                  <Form.Control 
                    type="date" 
                    value={newDate} 
                    onChange={e => setNewDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')} // Prevent selecting past dates
                    required 
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Reason</Form.Label>
                  <Form.Control 
                    type="text" 
                    placeholder="e.g., Public Holiday, Private Event" 
                    value={newReason}
                    onChange={e => setNewReason(e.target.value)}
                    required 
                  />
                </Form.Group>
                <div className="d-grid">
                  <Button variant="primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Spinner as="span" size="sm" /> : 'Add Date'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={7}>
          <Card className="shadow-sm">
            <Card.Header as="h5">Current Schedule</Card.Header>
            <Card.Body>
              {loading ? <div className="text-center"><Spinner /></div> : 
               error ? <Alert variant="danger">{error}</Alert> :
               unavailableDates.length === 0 ? <Alert variant="info">No unavailable dates have been set.</Alert> :
                <ListGroup variant="flush" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  {unavailableDates.map(record => (
                    <ListGroup.Item key={record._id} className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="fw-bold mb-0">{format(new Date(record.date), 'EEEE, MMMM dd, yyyy')}</p>
                        <p className="text-muted mb-0">{record.reason}</p>
                      </div>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDeleteDate(record._id)}>
                        <Trash />
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              }
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ManageUnavailability;