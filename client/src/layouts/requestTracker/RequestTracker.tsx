import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, Spinner, Alert, Badge } from 'react-bootstrap';
import { Search, InfoCircleFill, BoxSeam, CalendarEvent } from 'react-bootstrap-icons';
import api from '../../services/api';
import { Reservation, Appointment } from '../../types';
import { StatusTimeline } from '../../components/statusTimeline/StatusTimeline';
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

    const isCancelled = searchResult.data.status === 'Cancelled';
    const commonTitleIcon = searchResult.type === 'reservation' ? <BoxSeam/> : <CalendarEvent/>;
    
    const steps = searchResult.type === 'reservation' 
      ? ['Pending', 'Confirmed', 'Completed'] 
      : ['Pending', 'Confirmed', 'Completed'];

    const getStatusBadgeVariant = (status: Reservation['status'] | Appointment['status']) => {
      const variants: any = { 
        Pending: 'primary', 
        Confirmed: 'info', 
        Completed: 'success', 
        Cancelled: 'danger' 
      };
      return variants[status] || 'secondary';
    };

    return (
      <div className="text-center">
        <h4 className="mb-0 d-flex align-items-center justify-content-center">
          {commonTitleIcon}
          <span className="mx-2">Status for {searchResult.type === 'reservation' ? 'Reservation' : 'Appointment'}:</span>
        </h4>
        <p className="h5 fw-bold text-danger mb-2">{searchResult.data._id}</p>
        <Badge bg={getStatusBadgeVariant(searchResult.data.status)} pill className="mb-3 fs-6">
          {searchResult.data.status}
        </Badge>

        <div className={isCancelled ? 'timeline-cancelled' : ''}>
          <StatusTimeline steps={steps} currentStatus={searchResult.data.status} />
        </div>
        
        {isCancelled ? (
          <div className="cancellation-info-box">
            <h6 className="fw-bold">Reason for Cancellation:</h6>
            <p className="fst-italic mb-3">"{searchResult.data.cancellationReason || 'No reason provided.'}"</p>
            <hr/>
            <p className="small text-muted mb-0">
              <InfoCircleFill className="me-2"/>
              For questions regarding this cancellation, please contact us and provide your request ID.
            </p>
          </div>
        ) : (
          <Alert variant="info" className="text-center small py-2 my-4">
            {searchResult.data.status === 'Pending' && "Our staff is reviewing your request. Please check back later for updates."}
            {searchResult.data.status === 'Confirmed' && "Your request is confirmed! We look forward to seeing you."}
            {searchResult.data.status === 'Completed' && `This request has been completed.`}
          </Alert>
        )}
      </div>
    );
  };
  
  return (
    // --- MODIFICATION START: The wrapper no longer needs an inner container ---
    <div className="tracker-page-wrapper" style={{ backgroundImage: `url(${TrackerBackgroundImage})` }}>
      <Row className="justify-content-center">
        <Col md={8} lg={6} xl={5} style={{ maxWidth: '550px' }}>
          <Card className="shadow-lg">
            <Card.Body className={!searchResult ? "p-4 p-md-5" : "p-4"}>
              {!searchResult ? (
                <div className="text-center">
                  <h2 className="mb-3 fw-bold">Track Your Request</h2>
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
                        className="text-center form-control-lg"
                        isInvalid={!!error}
                      />
                      <Form.Control.Feedback type="invalid">
                        {error}
                      </Form.Control.Feedback>
                    </Form.Group>
                    <div className="d-grid mt-3">
                      <Button type="submit" disabled={isLoading} size="lg">
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
    // --- MODIFICATION END ---
  );
}

export default RequestTracker;