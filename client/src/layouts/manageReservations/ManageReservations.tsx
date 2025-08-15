import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// --- 1. IMPORT NEW COMPONENTS AND ICONS ---
import { Container, Card, Nav, Spinner, Alert, InputGroup, Form, Button, Row, Col, Badge, Image, Collapse } from 'react-bootstrap';
import { Search, EyeFill, PersonCircle } from 'react-bootstrap-icons';
import { format } from 'date-fns';

import { Reservation } from '../../types';
import api from '../../services/api';
// --- 2. IMPORT UTILITIES ---
import { formatCurrency } from '../../utils/formatters';
import { calculateItemDeposit, calculatePackageDeposit } from '../../utils/financials';
import namer from 'color-namer';
import CustomPagination from '../../components/customPagination/CustomPagination';

type TabStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';

function ManageReservations() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabStatus>('Pending');
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedReservations, setExpandedReservations] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchReservations = async () => {
      setLoading(true);
      setError(null);
      try {
        // Pass pagination parameters to the API
        const response = await api.get('/reservations', {
          params: {
            page: currentPage,
            limit: ITEMS_PER_PAGE,
          }
        });
        // The backend response is now an object, not an array
        setAllReservations(response.data.reservations || []);
        setTotalPages(response.data.totalPages || 1);
      } catch (err) {
        setError("Failed to load reservations. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchReservations();
  }, [currentPage]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, activeTab]);

  const getMotifName = (hex: string) => {
    try {
      const names = namer(hex);
      const name = names.ntc[0]?.name || 'Custom Color';
      return name.replace(/\b\w/g, char => char.toUpperCase());
    } catch {
      return 'Custom Color';
    }
  };

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
    // This logic now filters the data for the CURRENT PAGE only
    return allReservations.filter(reservation => {
      if (!reservation || !reservation.status) return false;
      const tabMatch = reservation.status === activeTab;
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

  // --- 4. REWRITE THE RENDER FUNCTION TO MIMIC MANAGE RENTALS ---
  const renderReservationCard = (reservation: Reservation) => {
    const customer = reservation.customerInfo;

    // Combine all items into a single list for easy rendering
    const allItems = [
      ...(reservation.itemReservations || []).map(item => ({
        key: item.reservationId,
        imageUrl: item.imageUrl,
        name: item.itemName,
        variation: `${(item.variation.color as any).name}, ${item.variation.size}`,
        price: item.price * item.quantity,
        quantity: item.quantity,
      })),
      ...(reservation.packageReservations || []).map(pkg => ({
        key: pkg.packageReservationId,
        imageUrl: pkg.imageUrl,
        name: pkg.packageName,
        variation: `Motif: ${getMotifName(pkg.motifHex || '#000000')}`,
        price: pkg.price,
        quantity: 1,
      }))
    ];

    const subtotal = allItems.reduce((sum, item) => sum + item.price, 0);
    const deposit = 
      (reservation.itemReservations || []).reduce((sum, item) => sum + calculateItemDeposit(item), 0) +
      (reservation.packageReservations || []).length * calculatePackageDeposit();
    const grandTotal = subtotal + deposit;

    const ITEMS_TO_SHOW_INITIALLY = 2;
    const hasMoreItems = allItems.length > ITEMS_TO_SHOW_INITIALLY;
    const isExpanded = expandedReservations.has(reservation._id);
    const displayedItems = allItems.slice(0, ITEMS_TO_SHOW_INITIALLY);
    const hiddenItems = allItems.slice(ITEMS_TO_SHOW_INITIALLY);

    const toggleExpansion = () => {
      setExpandedReservations(prev => {
        const newSet = new Set(prev);
        if (newSet.has(reservation._id)) {
          newSet.delete(reservation._id);
        } else {
          newSet.add(reservation._id);
        }
        return newSet;
      });
    };

    return (
      <Card key={reservation._id} className="mb-4 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-light">
          <div>
            <strong>ID: {reservation._id}</strong>
            <small className="text-muted ms-2">(Created: {format(new Date(reservation.createdAt), 'MMM dd, yyyy')})</small>
          </div>
          <Badge bg={getStatusBadgeVariant(reservation.status)} pill>{reservation.status.toUpperCase()}</Badge>
        </Card.Header>
        <Card.Body className="p-4">
            <p className="mb-1"><span className='fw-medium'>Customer: </span>{customer.name}</p>
            <p className="mb-1 text-muted small">Contact: {customer.phoneNumber}</p>
            <hr className="my-2"/>

            {displayedItems.map((item) => (
              <Row key={item.key} className="align-items-center my-1">
                <Col xs="auto" className="me-3">
                  <Image src={item.imageUrl || 'https://placehold.co/80x80/e9ecef/adb5bd?text=Item'} fluid rounded style={{ width: "80px", height: "80px", objectFit: "cover" }} />
                </Col>
                <Col className='lh-sm'>
                  <p className="mb-0 fw-bold">{item.name}</p>
                  <p className="mb-0 text-muted small fst-italic">{item.variation}</p>
                  <p className="mb-1 text-muted small">Qty: {item.quantity}</p>
                </Col>
                <Col xs="auto" className="text-end">
                  <p className="mb-0 fw-bold text-danger fs-5">₱{formatCurrency(item.price)}</p>
                </Col>
              </Row>
            ))}

            {hasMoreItems && (
              <>
                <Collapse in={isExpanded}>
                  <div id={`reservation-items-collapse-${reservation._id}`}>
                    {hiddenItems.map((item) => (
                      <Row key={item.key} className="align-items-center my-1">
                        <Col xs="auto" className="me-3 ">
                            <Image src={item.imageUrl || 'https://placehold.co/80x80/e9ecef/adb5bd?text=Item'} fluid rounded style={{ width: "80px", height: "80px", objectFit: "cover" }} />
                        </Col>
                        <Col className='lh-sm'>
                            <p className="mb-0 fw-bold">{item.name}</p>
                            <p className="mb-1 text-muted small fst-italic">{item.variation}</p>
                        </Col>
                        <Col xs="auto" className="text-end">
                            <p className="mb-0 fw-bold text-danger fs-5">₱{formatCurrency(item.price)}</p>
                        </Col>
                      </Row>
                    ))}
                  </div>
                </Collapse>
                <Button variant="link" onClick={toggleExpansion} className="text-decoration-none p-0 mt-1">
                  <span className='small'>{isExpanded
                    ? 'Show Less'
                    : `Show ${hiddenItems.length} more ${hiddenItems.length > 1 ? 'items' : 'item'}`}
                  </span>
                </Button>
              </>
            )}

            <hr className="my-2"/>
            <Row className="align-items-center">
              <Col>
                <p className="mb-0 text-muted small">Total Amount</p>
                <p className="fw-bold fs-5 mb-0"><span className="text-danger">₱{formatCurrency(grandTotal)}</span></p>
                <p className="text-muted fst-italic mb-0" style={{ fontSize: '0.75rem' }}>(Includes ₱{formatCurrency(deposit)} deposit)</p>
                <p className="mb-1 text-muted small mt-2">Reservation Date: {format(new Date(reservation.reserveDate), 'MMM dd, yyyy')}</p>
              </Col>
              <Col className="d-flex justify-content-end align-items-center">
                <Button
                  variant="outline-primary"
                  onClick={() => navigate(`/reservations/${reservation._id}`)}
                >
                  <EyeFill className="me-1" /> View Details
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
          <Card.Footer className="bg-white">
            {!loading && totalPages > 1 && (
              <CustomPagination
                active={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            )}
          </Card.Footer>
        </Card>
      </Container>
    </div>
  );
}

export default ManageReservations;