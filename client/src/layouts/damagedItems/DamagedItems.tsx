import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Spinner, Alert, Button, Badge, Row, Col, InputGroup, Form } from 'react-bootstrap';
import { Wrench, BoxArrowUpRight, Trash, CheckLg, Search } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';

// Define the type for a damaged item record
interface DamagedItem {
  _id: string;
  itemName: string;
  variation: string;
  imageUrl?: string;
  rentalId: string;
  quantity: number;
  damageReason: string;
  status: 'Awaiting Repair' | 'Under Repair' | 'Repaired' | 'Disposed';
  createdAt: string;
}

const statusVariants = {
  'Awaiting Repair': 'warning',
  'Under Repair': 'info',
  'Repaired': 'success',
  'Disposed': 'secondary',
};

function DamagedItems() {
  const navigate = useNavigate();
  const { addAlert } = useAlert();
  const [damagedItems, setDamagedItems] = useState<DamagedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    
    // Debounce timer to wait for the user to stop typing
    const timer = setTimeout(() => {
      const fetchDamagedItems = async () => {
        setError(null);
        try {
          // Pass the searchTerm as a query parameter
          const response = await api.get('/damaged-items', {
            params: { search: searchTerm }
          });
          setDamagedItems(response.data || []);
        } catch (err) {
          setError('Failed to load damaged items.');
        } finally {
          setLoading(false);
        }
      };
      fetchDamagedItems();
    }, 500); // 500ms delay

    // Cleanup function to clear the timer if the user types again
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  const handleStatusUpdate = async (id: string, newStatus: DamagedItem['status']) => {
    const itemToUpdate = damagedItems.find(item => item._id === id);
    if (!itemToUpdate) return;
    
    // Optimistic UI update
    setDamagedItems(prev => prev.map(item => item._id === id ? { ...item, status: newStatus } : item));
    
    try {
        await api.put(`/damaged-items/${id}`, { status: newStatus });
        addAlert(`Item "${itemToUpdate.itemName}" marked as ${newStatus}.`, 'success');
        if (newStatus === 'Repaired') {
            // If repaired, we remove it from this list as it's back in circulation
            setDamagedItems(prev => prev.filter(item => item._id !== id));
        }
    } catch (err: any) {
        addAlert(err.response?.data?.message || `Failed to update status.`, 'danger');
        // Revert UI on error
        setDamagedItems(prev => prev.map(item => item._id === id ? itemToUpdate : item));
    }
  };


  return (
    <Container fluid>
      <h2 className="mb-4">Damaged Items Management</h2>
      <Card className="shadow-sm">
        <Card.Header>
          <Row className="align-items-center">
            <Col md={7}>
                <div className="d-flex align-items-center">
                    <Wrench size={24} className="me-2"/>
                    <h5 className="mb-0">Items Awaiting Repair or Disposal</h5>
                </div>
            </Col>
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text><Search /></InputGroup.Text>
                <Form.Control
                  type="search"
                  placeholder="Search by Item Name, Rental ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5"><Spinner /></div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : (
            <Table striped bordered hover responsive className="align-middle">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Damage Reason</th>
                  <th>Rental ID</th>
                  <th>Date Logged</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {damagedItems.length > 0 ? (
                  damagedItems.map(item => (
                    <tr key={item._id}>
                      <td>
                        <div className="d-flex align-items-center">
                            <img src={item.imageUrl || 'https://placehold.co/60x60/e9ecef/adb5bd?text=N/A'} alt={item.itemName} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '0.25rem' }}/>
                            <div className="ms-3 lh-1">
                                <p className="fw-bold mb-0">{item.itemName}</p>
                                <small className="text-muted">{item.variation} </small><br/>
                                <small className="text-muted">Qty: {item.quantity}</small>
                            </div>
                        </div>
                      </td>
                      <td>{item.damageReason}</td>
                      <td>
                        <Button variant="link" size="sm" className="p-0" onClick={() => navigate(`/rentals/${item.rentalId}`)}>
                            {item.rentalId} <BoxArrowUpRight size={12}/>
                        </Button>
                      </td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Badge bg={statusVariants[item.status] || 'secondary'}>{item.status}</Badge>
                      </td>
                      <td className="text-center">
                          {item.status !== 'Repaired' && item.status !== 'Disposed' && (
                              <>
                                  <Button variant="outline-success" size="sm" className="me-2" title="Mark as Repaired" onClick={() => handleStatusUpdate(item._id, 'Repaired')}>
                                    <CheckLg/>
                                  </Button>
                                  <Button variant="outline-secondary" size="sm" title="Mark as Disposed" onClick={() => handleStatusUpdate(item._id, 'Disposed')}>
                                    <Trash/>
                                  </Button>
                              </>
                          )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="text-center text-muted py-4">No damaged items found.</td></tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default DamagedItems;