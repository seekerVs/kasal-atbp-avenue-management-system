import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Nav,
  Button,
  Card,
  Spinner,
  Alert,
  Modal,
  InputGroup,
  Form,
} from 'react-bootstrap';
import {
  CalendarCheck,
  ArrowCounterclockwise,
  CheckCircleFill,
  XCircleFill,
  Search,
} from 'react-bootstrap-icons';

import { RentalOrder, RentalStatus } from '../../types'; 
import api from '../../services/api';
import { BookingCard } from '../../components/bookingCard/BookingCard';


type TabStatus = RentalStatus;

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function ManageRentals() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabStatus>('Pending');
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rentalToCancel, setRentalToCancel] = useState<RentalOrder | null>(null);
  const [expandedRentals, setExpandedRentals] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRentals();
  }, []);

  useEffect(() => {
    const state = location.state as { activeTab?: TabStatus };

    // If a valid activeTab was passed in the state, update our component's state.
    if (state?.activeTab) {
      setActiveTab(state.activeTab);

      // Optional: Clear the state so this doesn't re-trigger on refresh.
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchRentals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/rentals');
      setAllRentals(response.data || []);
    } catch (err) {
      console.error("Error fetching rentals:", err);
      setError("Failed to load rentals. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredRentals = allRentals.filter(rental => {
    if (!rental || !rental._id) return false;

    const tabMatch = rental.status === activeTab;

    if (!tabMatch) {
      return false;
    }

    if (!searchTerm.trim()) {
      return true;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const customerName = rental.customerInfo[0]?.name?.toLowerCase() || '';
    const orderId = rental._id.toLowerCase();
    const customerPhone = rental.customerInfo[0]?.phoneNumber || '';

    return (
      customerName.includes(lowercasedSearch) ||
      orderId.includes(lowercasedSearch) ||
      customerPhone.includes(lowercasedSearch)
    );
  });

  const handleConfirmCancel = async () => {
    if (!rentalToCancel) return;
    try {
      await api.put(
        `/rentals/${rentalToCancel._id}/process`, 
        { status: 'Cancelled' }
      );
      fetchRentals();
    } catch (err) {
      console.error("Error cancelling rental:", err);
      setError("Failed to cancel the rental. Please try again later.");
      const errorMessage = (err as any).response?.data?.message || "Failed to cancel the rental. Please try again later.";
      setError(errorMessage);
    } finally {
      setShowCancelModal(false);
      setRentalToCancel(null);
    }
  };

  const handleToggleExpansion = (rentalId: string) => {
    setExpandedRentals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rentalId)) {
        newSet.delete(rentalId);
      } else {
        newSet.add(rentalId);
      }
      return newSet;
    });
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: '1rem', paddingBottom: '1rem' }}>
      <Container fluid="lg">
        <Card className="shadow-sm overflow-hidden">
          <Card.Header className="bg-white border-bottom-0 pt-3 px-3">
            <div className="d-flex flex-wrap justify-content-between align-items-center">
              <h2 className="mb-0">Orders Manager</h2>
              <div className="d-flex align-items-center gap-2">
                <InputGroup style={{ maxWidth: '400px' }}>
                  <InputGroup.Text><Search /></InputGroup.Text>
                  <Form.Control
                    type="search"
                    placeholder="Search by Customer, Rental ID, or Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </div>
            </div>
          </Card.Header>
          <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k as TabStatus)} className="px-3 pt-2">
            <Nav.Item><Nav.Link eventKey="Pending"><CalendarCheck className="me-1" />Pending</Nav.Link></Nav.Item>
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
              <Alert variant="info" className="m-3 text-center">
                {searchTerm.trim()
                  ? `No rentals match your search for "${searchTerm}" in this tab.`
                  : `No rental found for the "${activeTab}" status.`
                }
              </Alert>
            ) : (
              filteredRentals.map(rental => (
                <BookingCard
                  key={rental._id}
                  booking={rental}
                  type="rental"
                  isExpanded={expandedRentals.has(rental._id)}
                  onToggleExpansion={handleToggleExpansion}
                />
              ))
            )}
          </div>
        </Card>
      </Container>
      
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Cancellation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to cancel rental <strong>{rentalToCancel?._id}</strong>?
          This action will restore any applicable stock to inventory and cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Close</Button>
          <Button variant="danger" onClick={handleConfirmCancel}>Yes, Cancel Rental</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ManageRentals;