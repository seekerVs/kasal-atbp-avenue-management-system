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
  Collapse,
  InputGroup,
  Form,
} from 'react-bootstrap';
import {
  PersonCircle,
  EyeFill,
  BoxSeam,
  CalendarCheck,
  ArrowCounterclockwise,
  CheckCircleFill,
  XCircleFill,
  Search,
} from 'react-bootstrap-icons';

import { RentalOrder, RentalStatus } from '../../types'; 
import api from '../../services/api';
import { formatCurrency } from '../../utils/formatters';


type TabStatus = RentalStatus;

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function ManageRentals() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabStatus>('Pending');
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [rentalToCancel, setRentalToCancel] = useState<RentalOrder | null>(null);
  const [expandedRentals, setExpandedRentals] = useState<Map<string, boolean>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRentals();
  }, []);

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

  const getStatusBadgeVariant = (status: RentalStatus): BadgeVariant => {
    switch (status) {
      case 'Pending': return 'primary';
      case 'To Pickup': return 'info';
      case 'To Return': return 'warning';
      case 'Returned': return 'success';
      case 'Completed': return 'success';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const filteredRentals = allRentals.filter(rental => {
    if (!rental || !rental._id) return false;

    const lowercasedStatus = rental.status.toLowerCase();
    const lowercasedActiveTab = activeTab.toLowerCase();

    let tabMatch = false;
    if (lowercasedActiveTab === 'completed') {
      tabMatch = lowercasedStatus === 'returned' || lowercasedStatus === 'completed';
    } else {
      tabMatch = lowercasedStatus === lowercasedActiveTab;
    }

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
  
  const handleShowCancelModal = (rental: RentalOrder) => {
    setRentalToCancel(rental);
    setShowCancelModal(true);
  };

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

  
  const renderRentalOrderCard = (rental: RentalOrder) => {
    if (!rental || !rental._id) return null;
    
    // const displayTotal = calculateOrderTotal(rental); // This line was deleted in previous steps.
    const customer = rental.customerInfo[0] || {};
    
    // Combine all items into a single list for rendering
    const allItems = [
        ...(rental.singleRents || []),
        ...(rental.packageRents || []),
        ...(rental.customTailoring || [])
    ];

    // --- NEW: Configuration for collapsible items ---
    const ITEMS_TO_SHOW_INITIALLY = 3;
    const hasMoreItems = allItems.length > ITEMS_TO_SHOW_INITIALLY;
    const isExpanded = expandedRentals.get(rental._id) || false; // Check if this rental is expanded

    const displayedItems = allItems.slice(0, ITEMS_TO_SHOW_INITIALLY);
    const hiddenItems = allItems.slice(ITEMS_TO_SHOW_INITIALLY);

    // Function to toggle expansion for this specific rental
    const toggleExpansion = () => {
        setExpandedRentals(prevMap => {
            const newMap = new Map(prevMap);
            newMap.set(rental._id, !isExpanded);
            return newMap;
        });
    };

    return (
      <Card key={rental._id} className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light border-bottom">
          <div>
            <strong className="me-2">Rental ID: {rental._id}</strong>
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
                    {displayedItems.map((item, index) => {
            // --- NEW: Parsing Logic ---
            const nameParts = item.name.split(',');
            const productName = nameParts[0].trim(); // The first part is always the name
            
            // Check if there are variation parts (e.g., color, size)
            const hasVariation = nameParts.length > 1;
            // Construct the variation string, e.g., "Champagne, M"
            const variationText = hasVariation ? `${nameParts[1]}, ${nameParts[2]}`.trim() : null;

            return (
              <Row key={index} className="align-items-center my-3">
                <Col xs="auto" className="me-3">
                  <Image src={item.imageUrl || 'https://placehold.co/80x80/e9ecef/adb5bd?text=Item'} fluid rounded style={{ width: "80px", height: "80px", objectFit: "cover" }} />
                </Col>
                <Col>
                  {/* Display the parsed product name */}
                  <p className="mb-0 fw-bold">{productName}</p>
                  
                  {/* Conditionally render the variation text if it exists */}
                  {variationText && (
                      <p className="mb-1 text-muted small fst-italic">{variationText}</p>
                  )}
                  
                  {/* Display the quantity */}
                  <p className="mb-0 text-muted small">Qty: {item.quantity}</p>
                </Col>
                <Col xs="auto" className="text-end">
                  <p className="mb-0 fw-bold text-danger" style={{ fontSize: "1.05em" }}>
                    ₱{formatCurrency(item.price * item.quantity)}
                  </p>
                </Col>
              </Row>
            );
          })}

          {/* ======================================================= */}
          {/* --- ADD THE COLLAPSIBLE SECTION --- */}
          {/* ======================================================= */}
                    {hasMoreItems && (
              <>
                  <Collapse in={isExpanded}>
                      <div id={`rental-items-collapse-${rental._id}`}>
                          {hiddenItems.map((item, index) => {
                            // --- NEW: Parsing Logic ---
                            const nameParts = item.name.split(',');
                            const productName = nameParts[0].trim();
                            const hasVariation = nameParts.length > 1;
                            const variationText = hasVariation ? `${nameParts[1]}, ${nameParts[2]}`.trim() : null;

                            return (
                              <Row key={`hidden-${index}`} className="align-items-center my-3">
                                  <Col xs="auto" className="me-3">
                                      <Image src={item.imageUrl || 'https://placehold.co/80x80/e9ecef/adb5bd?text=Item'} fluid rounded style={{ width: "80px", height: "80px", objectFit: "cover" }} />
                                  </Col>
                                  <Col>
                                      {/* Display the parsed product name */}
                                      <p className="mb-0 fw-bold">{productName}</p>
                                      
                                      {/* Conditionally render the variation text */}
                                      {variationText && (
                                          <p className="mb-1 text-muted small fst-italic">{variationText}</p>
                                      )}
                                      
                                      {/* Display the quantity */}
                                      <p className="mb-0 text-muted small">Qty: {item.quantity}</p>
                                  </Col>
                                  <Col xs="auto" className="text-end">
                                      <p className="mb-0 fw-bold text-danger" style={{ fontSize: "1.05em" }}>
                                        ₱{formatCurrency(item.price * item.quantity)}
                                      </p>
                                  </Col>
                              </Row>
                            );
                          })}
                      </div>
                  </Collapse>
                  <Button 
                      variant="link" 
                      onClick={toggleExpansion} 
                      aria-controls={`rental-items-collapse-${rental._id}`}
                      aria-expanded={isExpanded}
                      className="text-decoration-none p-0 mt-2"
                  >
                      {isExpanded ? 'Show Less' : `Show ${hiddenItems.length} More Items`}
                  </Button>
              </>
          )}
          {/* ======================================================= */}

          <hr className="my-3" />
          <Row className="align-items-center">
            <Col>
              <div className="mb-2">
                <p className="mb-0 text-muted small">Total Amount</p>
                <p className="fw-bold fs-5 mb-0"><span className="text-danger">₱{formatCurrency(rental.financials.grandTotal || 0)}</span></p>
                {(rental.financials.depositAmount > 0 || rental.financials.shopDiscount > 0) && (
                  <p className="text-muted fst-italic mb-0" style={{ fontSize: '0.75rem' }}>
                    (Includes 
                    {rental.financials.depositAmount > 0 && ` ₱${formatCurrency(rental.financials.depositAmount)} deposit`}
                    {rental.financials.depositAmount > 0 && rental.financials.shopDiscount > 0 && ' &'}
                    {rental.financials.shopDiscount > 0 && ` ₱${formatCurrency(rental.financials.shopDiscount)} discount`}
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
                {rental.status === 'Pending' && (
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
    <div style={{ minHeight: "100vh", paddingTop: '1rem', paddingBottom: '1rem' }}>
      <Container fluid="lg">
        <Card className="shadow-sm overflow-hidden">
          <Card.Header className="bg-white border-bottom-0 pt-3 px-3">
            <div className="d-flex flex-wrap justify-content-end align-items-center">
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