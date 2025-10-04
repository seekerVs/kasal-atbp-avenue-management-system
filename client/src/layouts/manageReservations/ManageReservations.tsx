import { useState, useEffect, useMemo } from 'react';
// --- 1. IMPORT NEW COMPONENTS AND ICONS ---
import { Container, Card, Nav, Spinner, Alert, InputGroup, Form } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';

import { Reservation } from '../../types';
import api from '../../services/api';
import CustomPagination from '../../components/customPagination/CustomPagination';
import { BookingCard } from '../../components/bookingCard/BookingCard';
import { useLocation } from 'react-router-dom';

type TabStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

function ManageReservations() {
  const location = useLocation();
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
    const state = location.state as { activeTab?: TabStatus };

    // If a valid activeTab was passed in the state, update our component's state.
    if (state?.activeTab) {
      setActiveTab(state.activeTab);

      // Optional but recommended: Clear the state so this doesn't re-trigger on refresh.
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, activeTab]);

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

  const handleToggleExpansion = (reservationId: string) => {
    setExpandedReservations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reservationId)) {
        newSet.delete(reservationId);
      } else {
        newSet.add(reservationId);
      }
      return newSet;
    });
  };

  return (
    <div style={{ minHeight: "100vh", paddingTop: '1rem', paddingBottom: '1rem' }}>
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
              filteredReservations.map(reservation => (
                <BookingCard 
                  key={reservation._id}
                  booking={reservation}
                  type="reservation"
                  isExpanded={expandedReservations.has(reservation._id)}
                  onToggleExpansion={handleToggleExpansion}
                />
              ))
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