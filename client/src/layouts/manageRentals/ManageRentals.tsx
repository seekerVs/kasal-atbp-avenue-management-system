import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Nav,
  Image,
  Button,
  Card,
  Badge,
  Spinner,
  Alert,
  Modal,
} from 'react-bootstrap';
import {
  PersonCircle,
  EyeFill,
  BoxSeam,
  CalendarCheck,
  ArrowCounterclockwise,
  CheckCircleFill,
  XCircleFill,
} from 'react-bootstrap-icons';
import axios from 'axios';
import { RentalOrder, RentalStatus } from '../../types'; 


type TabStatus = RentalStatus | 'All';

const API_URL = 'http://localhost:3001/api';
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function ManageRentals() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabStatus>('To Process');
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rentalToCancel, setRentalToCancel] = useState<RentalOrder | null>(null);

  useEffect(() => {
    fetchRentals();
  }, []);

  const fetchRentals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}/rentals`);
      setAllRentals(response.data || []);
    } catch (err) {
      console.error("Error fetching rentals:", err);
      setError("Failed to load rental orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredRentals = allRentals.filter(rental => {
    if (!rental || !rental._id) return false;
    if (activeTab === 'All') {
      return rental.status !== 'Cancelled';
    }
    if (activeTab === 'Completed') {
      return rental.status === 'Returned' || rental.status === 'Completed';
    }
    return rental.status === activeTab;
  });

  const getStatusBadgeVariant = (status: RentalStatus): BadgeVariant => {
    switch (status) {
      case 'To Process': return 'primary';
      case 'To Pickup': return 'info';
      case 'To Return': return 'warning';
      case 'Returned': return 'success';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };
  
  const handleShowCancelModal = (rental: RentalOrder) => {
    setRentalToCancel(rental);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!rentalToCancel) return;
    try {
      await axios.put(
            `${API_URL}/rentals/${rentalToCancel._id}/process`, 
            { status: 'Cancelled' }
      );
      fetchRentals();
    } catch (err) {
      console.error("Error cancelling rental:", err);
      setError("Failed to cancel the order. Please try again later.");
      const errorMessage = (err as any).response?.data?.message || "Failed to cancel the order. Please try again later.";
      setError(errorMessage);
    } finally {
      setShowCancelModal(false);
      setRentalToCancel(null);
    }
  };

  const renderRentalOrderCard = (rental: RentalOrder) => {
    if (!rental || !rental._id) return null;
    const customer = rental.customerInfo[0] || {};
    
    // Combine all items into a single list for rendering
    const allItems = [
        ...(rental.singleRents || []),
        ...(rental.packageRents || []),
        ...(rental.customTailoring || [])
    ];

    return (
      <Card key={rental._id} className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light border-bottom">
          <div>
            <strong className="me-2">Order ID: {rental._id}</strong>
            <small className="text-muted">(Date: {new Date(rental.createdAt).toLocaleDateString()})</small>
          </div>
          <Badge bg={getStatusBadgeVariant(rental.status)} pill>{rental.status.toUpperCase()}</Badge>
        </Card.Header>
        <Card.Body className="p-4">
          <Row className="mb-3 align-items-center">
            <Col>
              <p className="mb-1"><PersonCircle className="me-2" />Customer: <strong className="text-dark">{customer.name}</strong></p>
              <p className="mb-0 text-muted small">Contact: {customer.phoneNumber}</p>
            </Col>
          </Row>
          <hr />
          {allItems.map((item, index) => (
            <Row key={index} className="align-items-center my-3">
              <Col xs="auto" className="me-3">
                <Image src={item.imageUrl || 'https://placehold.co/80x80/e9ecef/adb5bd?text=Item'} fluid rounded style={{ width: "80px", height: "80px", objectFit: "cover" }} />
              </Col>
              <Col>
                <p className="mb-0 fw-bold">{item.name}</p>
                <p className="mb-0 text-muted small">Qty: {item.quantity}</p>
              </Col>
              <Col xs="auto" className="text-end">
                <p className="mb-0 fw-bold text-danger" style={{ fontSize: "1.05em" }}>₱{(item.price * item.quantity).toFixed(2)}</p>
              </Col>
            </Row>
          ))}
          <hr className="my-3" />
          <Row className="align-items-center">
            <Col>
              <div className="mb-2">
                <p className="mb-0 text-muted small">Total Amount</p>
                <p className="fw-bold fs-5 mb-0">
                  <span className="text-danger">
                    {/* Use the server-calculated value. Provide a fallback of 0. */}
                    ₱{(rental.financials.grandTotal || 0).toFixed(2)}
                  </span>
                </p>
                {(rental.financials.depositAmount > 0 || rental.financials.shopDiscount > 0) && (
                  <p className="text-muted fst-italic mb-0" style={{ fontSize: '0.75rem' }}>
                    (Includes 
                    {rental.financials.depositAmount > 0 && ` ₱${rental.financials.depositAmount.toFixed(2)} deposit`}
                    {rental.financials.depositAmount > 0 && rental.financials.shopDiscount > 0 && ' &'}
                    {rental.financials.shopDiscount > 0 && ` ₱${rental.financials.shopDiscount.toFixed(2)} discount`}
                    )
                  </p>
                )}
              </div>
              <p className="mb-1 text-muted small">
                Rental Period: {new Date(rental.rentalStartDate).toLocaleDateString()} - {new Date(rental.rentalEndDate).toLocaleDateString()}
              </p>
            </Col>
            <Col className="d-flex justify-content-end align-items-center">
              <div className="d-flex align-items-center gap-2">
                {rental.status === 'To Process' && (
                  <Button variant="outline-secondary" onClick={() => handleShowCancelModal(rental)}>
                    <XCircleFill className="me-1" /> Cancel
                  </Button>
                )}
                <Button 
                  variant="outline-danger" 
                  style={{'--bs-btn-color': '#8B0000', '--bs-btn-border-color': '#8B0000', '--bs-btn-hover-bg': '#8B0000', '--bs-btn-hover-color': 'white'} as React.CSSProperties}
                  onClick={() => navigate(`/rentals/${rental._id}`)}
                >
                  <EyeFill className="me-1" /> View Details
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    );
  };

  return (
    <div style={{ backgroundColor: "#F8F9FA", minHeight: "100vh", paddingTop: '1rem', paddingBottom: '1rem' }}>
      <Container fluid="lg">
        <Card className="shadow-sm overflow-hidden">
          <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k as TabStatus)} className="px-3 pt-2">
            <Nav.Item><Nav.Link eventKey="All"><BoxSeam className="me-1" />All Rentals</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="To Process"><CalendarCheck className="me-1" />To Process</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="To Pickup"><CalendarCheck className="me-1" />To Pickup</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="To Return"><ArrowCounterclockwise className="me-1" />To Return</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Completed"><CheckCircleFill className="me-1" />Completed</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="Cancelled"><XCircleFill className="me-1" />Cancelled</Nav.Link></Nav.Item>
          </Nav>
          <div className="p-4">
            {loading ? (
              <div className="text-center py-5"><Spinner animation="border" /><p className="mt-2">Loading Rentals...</p></div>
            ) : error ? (
              <Alert variant="danger">{error}</Alert>
            ) : filteredRentals.length === 0 ? (
              <Alert variant="info">No rental orders found for the "{activeTab}" status.</Alert>
            ) : (
              filteredRentals.map(renderRentalOrderCard)
            )}
          </div>
        </Card>
      </Container>
      
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Cancellation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to cancel order <strong>{rentalToCancel?._id}</strong>?
          This action will restore any applicable stock to inventory and cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Close</Button>
          <Button variant="danger" onClick={handleConfirmCancel}>Yes, Cancel Order</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ManageRentals;