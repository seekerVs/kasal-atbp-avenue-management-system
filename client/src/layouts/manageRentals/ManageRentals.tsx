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

// ===================================================================================
// --- TYPE DEFINITIONS ---
// ===================================================================================
interface CustomerInfo {
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
}
interface ItemVariation {
  color: string;
  size: string;
  imageUrl: string;
}
interface RentedItem {
  name: string;
  price: number;
  quantity: number;
  variation: ItemVariation;
}

// Define the precise statuses a rental document can have in the database
type DocumentStatus = 'To Process' | 'To Return' | 'Returned' | 'Completed' | 'Cancelled';

// Define the possible states for the navigation tabs, which includes the special 'All' case
type TabStatus = DocumentStatus | 'All';

interface RentalOrder {
  _id: string;
  customerInfo: CustomerInfo[];
  items: RentedItem[];
  shopDiscount: number;
  rentalStartDate: string;
  rentalEndDate: string;
  status: DocumentStatus; // Use the precise type for the rental object
  createdAt: string;
}

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
      // This comparison is now type-safe and correct
      return rental.status === 'Returned' || rental.status === 'Completed';
    }
    
    return rental.status === activeTab;
  });

  const getStatusBadgeVariant = (status: DocumentStatus): BadgeVariant => {
    switch (status) {
      case 'To Process': return 'primary';
      case 'To Return': return 'warning';
      case 'Returned': return 'success';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const calculateOrderTotal = (rental: RentalOrder): number => {
    let total = rental.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discount = rental.shopDiscount || 0;
    if (!isNaN(discount)) {
      total -= discount;
    }
    return total > 0 ? total : 0;
  };
  
  const handleShowCancelModal = (rental: RentalOrder) => {
    setRentalToCancel(rental);
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!rentalToCancel) return;
    try {
      await axios.put(`${API_URL}/rentals/${rentalToCancel._id}/status`, { status: 'Cancelled' });
      fetchRentals();
    } catch (err) {
      console.error("Error cancelling rental:", err);
      setError("Failed to cancel the order. Please try again later.");
    } finally {
      setShowCancelModal(false);
      setRentalToCancel(null);
    }
  };

  const renderRentalOrderCard = (rental: RentalOrder) => {
    if (!rental || !rental._id) return null;
    const displayTotal = calculateOrderTotal(rental);
    const customer = rental.customerInfo[0] || {};

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
          {rental.items.map((item, index) => (
            <Row key={index} className="align-items-center my-3">
              <Col xs="auto" className="me-3"><Image src={item.variation.imageUrl} fluid rounded style={{ width: "80px", height: "80px", objectFit: "cover" }} /></Col>
              <Col>
                <p className="mb-0 fw-bold">{item.name}</p>
                <p className="mb-1 text-muted small">Variation: {item.variation.color}, {item.variation.size}</p>
                <p className="mb-0 text-muted small">Qty: {item.quantity}</p>
              </Col>
              <Col xs="auto" className="text-end"><p className="mb-0 fw-bold text-danger" style={{ fontSize: "1.05em" }}>₱{item.price.toFixed(2)}</p></Col>
            </Row>
          ))}
          <hr className="my-3" />
          <Row className="align-items-center">
            <Col>
              <div className="mb-2">
                <p className="mb-0 text-muted small">Total Amount</p>
                <p className="fw-bold fs-5 mb-0"><span className="text-danger">₱{displayTotal.toFixed(2)}</span></p>
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
          This action will restore the rented items to inventory and cannot be undone.
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