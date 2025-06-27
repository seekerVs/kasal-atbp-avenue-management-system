import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Badge,
  Button,
  Spinner,
  Alert,
  Image,
  Breadcrumb,
  Form,
  InputGroup,
  Toast,
  ToastContainer,
} from 'react-bootstrap';
import {
  PersonCircle,
  GeoAltFill,
  TelephoneFill,
  EnvelopeFill,
  CalendarCheck,
  BoxSeam,
  CheckCircleFill,
  ArrowCounterclockwise,
  HourglassSplit,
  Save,
  PencilSquare,
  XCircle,
  CashCoin,
  QrCode,
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
type RentalStatus = 'To Process' | 'To Return' | 'Returned';
interface RentalOrder {
  _id: string;
  customerInfo: CustomerInfo[];
  items: RentedItem[];
  shopDiscount: number;
  paymentMethod: 'Cash' | 'Gcash';
  gcashRefNum?: string;
  cashTendered?: number;
  rentalStartDate: string;
  rentalEndDate: string;
  status: RentalStatus;
  createdAt: string;
}

const API_URL = 'http://localhost:3001/api';
type BadgeVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';

// --- Helper Functions ---
const getStatusBadgeVariant = (status: RentalStatus): BadgeVariant => {
  switch (status) {
    case 'To Process': return 'primary';
    case 'To Return': return 'warning';
    case 'Returned': return 'success';
    default: return 'secondary';
  }
};
const getStatusIcon = (status: RentalStatus) => {
    switch (status) {
        case 'To Process': return <HourglassSplit size={20} className="me-2" />;
        case 'To Return': return <ArrowCounterclockwise size={20} className="me-2" />;
        case 'Returned': return <CheckCircleFill size={20} className="me-2" />;
        default: return null;
    }
};
const calculateSubtotal = (items: RentedItem[]): number => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};


// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function RentalViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [rental, setRental] = useState<RentalOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for editable data
  const [editableStartDate, setEditableStartDate] = useState('');
  const [editableEndDate, setEditableEndDate] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableCustomer, setEditableCustomer] = useState<CustomerInfo | null>(null);
  const [editableDiscount, setEditableDiscount] = useState('0');
  const [editablePaymentMethod, setEditablePaymentMethod] = useState<'Cash' | 'Gcash'>('Cash');
  const [editableGcashRef, setEditableGcashRef] = useState('');
  const [editableCashTendered, setEditableCashTendered] = useState('0');

  // State for notifications
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    if (!id) { setError("No rental ID provided."); setLoading(false); return; }
    const fetchRental = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_URL}/rentals/${id}`);
        const data: RentalOrder = response.data;
        setRental(data);
        setEditableStartDate(data.rentalStartDate);
        setEditableEndDate(data.rentalEndDate);
        setEditableCustomer(data.customerInfo[0]);
        setEditableDiscount(String(data.shopDiscount || '0'));
        if (data.paymentMethod) setEditablePaymentMethod(data.paymentMethod);
        setEditableGcashRef(data.gcashRefNum || '');
        setEditableCashTendered(String(data.cashTendered || '0'));
      } catch (err) {
        console.error("Error fetching rental:", err);
        setError("Failed to load rental details. The order may not exist.");
      } finally { setLoading(false); }
    };
    fetchRental();
  }, [id]);

  const handleUpdateStatus = async (newStatus: RentalStatus) => {
    if (!rental) return;
    const payload: any = { status: newStatus };
    if (rental.status === 'To Process') {
        payload.rentalStartDate = editableStartDate;
        payload.rentalEndDate = editableEndDate;
        payload.shopDiscount = parseFloat(editableDiscount) || 0;
        payload.paymentMethod = editablePaymentMethod;
        payload.gcashRefNum = editablePaymentMethod === 'Gcash' ? editableGcashRef : '';
        payload.cashTendered = editablePaymentMethod === 'Cash' ? parseFloat(editableCashTendered) || 0 : 0;
    }
    try {
        const response = await axios.put(`${API_URL}/rentals/${rental._id}/status`, payload);
        setRental(response.data);
    } catch (err) {
        console.error(`Error updating status:`, err);
        setError("Failed to update the rental status.");
    }
  };

  const handleSaveChanges = async () => { /* ... */ };
  const handleCancelEdit = () => { /* ... */ };
  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };

  const subtotal = useMemo(() => calculateSubtotal(rental?.items || []), [rental?.items]);
  const discountAmount = parseFloat(editableDiscount) || 0;
  const totalAmount = subtotal - discountAmount;
  const cashTenderedAmount = parseFloat(editableCashTendered) || 0;
  const changeAmount = cashTenderedAmount - totalAmount;

  if (loading) { return (<Container className="text-center py-5"><Spinner /></Container>); }
  if (error) { return <Container><Alert variant="danger">{error}</Alert></Container>; }
  if (!rental || !editableCustomer) { return <Container><Alert variant="info">Rental order data could not be displayed.</Alert></Container>; }
  
  const customerToDisplay = isEditMode ? editableCustomer : rental.customerInfo[0];

  return (
    <Container fluid>
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1056 }}>
        <Toast bg="success" className="text-white" onClose={() => setShowNotification(false)} show={showNotification} delay={3000} autohide>
          <Toast.Header closeButton={false}><strong className="me-auto">Success</strong></Toast.Header>
          <Toast.Body>{notificationMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => navigate('/manageRentals')}>Manage Rentals</Breadcrumb.Item>
        <Breadcrumb.Item active>View Rental</Breadcrumb.Item>
      </Breadcrumb>
      <h2 className="mb-4">Rental Details</h2>

      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
              <span>Order ID: {rental._id}</span>
              <small className="text-muted">Created: {new Date(rental.createdAt).toLocaleDateString()}</small>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0"><PersonCircle className="me-2"/>Customer Information</h5>
                {rental.status === 'To Process' && !isEditMode && (
                  <Button variant="outline-secondary" size="sm" onClick={() => setIsEditMode(true)}>
                    <PencilSquare className="me-1" /> Edit
                  </Button>
                )}
              </div>
              {isEditMode ? (
                <Form>
                    <Form.Group as={Row} className="mb-2 align-items-center"><Form.Label column sm="2"><strong>Name:</strong></Form.Label><Col sm="10"><Form.Control type="text" name="name" value={customerToDisplay.name} onChange={handleCustomerInputChange} /></Col></Form.Group>
                    <Form.Group as={Row} className="mb-2 align-items-center"><Form.Label column sm="2"><strong>Contact:</strong></Form.Label><Col sm="10"><Form.Control type="text" name="phoneNumber" value={customerToDisplay.phoneNumber} onChange={handleCustomerInputChange} /></Col></Form.Group>
                    <Form.Group as={Row} className="mb-2 align-items-center"><Form.Label column sm="2"><strong>Email:</strong></Form.Label><Col sm="10"><Form.Control type="email" name="email" value={customerToDisplay.email} onChange={handleCustomerInputChange} /></Col></Form.Group>
                    <Form.Group as={Row} className="mb-2 align-items-center"><Form.Label column sm="2"><strong>Address:</strong></Form.Label><Col sm="10"><Form.Control type="text" name="address" value={customerToDisplay.address} onChange={handleCustomerInputChange} /></Col></Form.Group>
                    <div className="d-flex justify-content-end mt-3"><Button variant="secondary" className="me-2" onClick={handleCancelEdit}><XCircle className="me-1" /> Cancel</Button><Button variant="success" onClick={handleSaveChanges}><Save className="me-1" /> Save Changes</Button></div>
                </Form>
              ) : (
                <>
                  <p><strong>Name:</strong> {customerToDisplay.name}</p>
                  <p><TelephoneFill className="me-2"/><strong>Contact:</strong> {customerToDisplay.phoneNumber}</p>
                  <p><EnvelopeFill className="me-2"/><strong>Email:</strong> {customerToDisplay.email || 'N/A'}</p>
                  <p><GeoAltFill className="me-2"/><strong>Address:</strong> {customerToDisplay.address}</p>
                </>
              )}
              <hr />
              <h5 className="mb-3"><BoxSeam className="me-2"/>Rented Items</h5>
              {rental.items.map((item, index) => (
                <Row key={index} className="align-items-center mb-3 border-bottom pb-3">
                  <Col xs="auto"><Image src={item.variation.imageUrl} thumbnail style={{ width: '80px', height: '80px', objectFit: 'cover' }} /></Col>
                  <Col>
                    <p className="fw-bold mb-1">{item.name}</p>
                    <p className="text-muted small mb-1">Variation: {item.variation.color}, {item.variation.size}</p>
                    <p className="text-muted small mb-0">Qty: {item.quantity}</p>
                  </Col>
                  <Col xs="auto" className="text-end"><p className="fw-bold h5 text-success">₱{item.price.toFixed(2)}</p></Col>
                </Row>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Header as="h5">Order Status & Actions</Card.Header>
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <Button variant="danger" className="p-3 fs-6 w-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#8B0000', border: 'none', cursor: 'default' }} active={false}>
                    {getStatusIcon(rental.status)}
                    {rental.status.toUpperCase()}
                </Button>
              </div>
              <div className="mb-3">
                <p className="mb-2 fw-bold">Rental Period:</p>
                <Form.Group className="mb-2"><Form.Label className="small text-muted">Start Date</Form.Label><Form.Control type="date" value={editableStartDate} onChange={(e) => setEditableStartDate(e.target.value)} disabled={rental.status !== 'To Process'} /></Form.Group>
                <Form.Group><Form.Label className="small text-muted">End Date</Form.Label><Form.Control type="date" value={editableEndDate} onChange={(e) => setEditableEndDate(e.target.value)} min={editableStartDate} disabled={rental.status !== 'To Process'} /></Form.Group>
              </div>
              <hr/>
              <div className="d-flex justify-content-between align-items-center mb-2"><span className="text-muted">Subtotal</span><span>₱{subtotal.toFixed(2)}</span></div>
              <Form.Group as={Row} className="align-items-center mb-2"><Form.Label column sm="6" className="text-muted">Shop Discount</Form.Label><Col sm="6"><InputGroup><InputGroup.Text>₱</InputGroup.Text><Form.Control type="number" value={editableDiscount} onChange={(e) => setEditableDiscount(e.target.value)} disabled={rental.status !== 'To Process'}/></InputGroup></Col></Form.Group>
              <div className="d-flex justify-content-between align-items-baseline mb-3"><p className="mb-0 fs-5 fw-bold">Total Amount:</p><p className="h4 fw-bold text-danger">₱{totalAmount.toFixed(2)}</p></div>
              <hr/>
              
              {rental.status === 'To Process' ? (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-bold">Payment Method</Form.Label>
                    <Form.Select value={editablePaymentMethod} onChange={(e) => setEditablePaymentMethod(e.target.value as any)} disabled={rental.status !== 'To Process'}>
                        <option value="Cash">Cash</option>
                        <option value="Gcash">Gcash</option>
                    </Form.Select>
                  </Form.Group>
                  {editablePaymentMethod === 'Gcash' && (
                    <Form.Group className="mb-3">
                      <Form.Label className="small text-muted">GCash Reference #</Form.Label>
                      <Form.Control type="text" placeholder="Enter reference number" value={editableGcashRef} onChange={(e) => setEditableGcashRef(e.target.value)} />
                    </Form.Group>
                  )}
                  {editablePaymentMethod === 'Cash' && (
                    <>
                      <Form.Group className="mb-2">
                        <Form.Label className="small text-muted">Cash Tendered</Form.Label>
                        <InputGroup><InputGroup.Text>₱</InputGroup.Text><Form.Control type="number" value={editableCashTendered} onChange={(e) => setEditableCashTendered(e.target.value)} /></InputGroup>
                      </Form.Group>
                      {cashTenderedAmount > 0 && changeAmount >= 0 && (
                          <div className="d-flex justify-content-between text-success"><small>Change:</small><small>₱{changeAmount.toFixed(2)}</small></div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div>
                  <p className="mb-2 fw-bold">Payment Details:</p>
                  <p className="mb-1"><CashCoin className="me-2"/><strong>Method:</strong> {rental.paymentMethod}</p>
                  {rental.paymentMethod === 'Gcash' && rental.gcashRefNum && <p className="mb-1"><QrCode className="me-2"/><strong>Reference:</strong> {rental.gcashRefNum}</p>}
                  {rental.paymentMethod === 'Cash' && <p className="mb-1"><strong>Tendered:</strong> ₱{rental.cashTendered?.toFixed(2)}</p>}
                </div>
              )}
              
              <div className="d-grid gap-2 mt-4">
                {rental.status === 'To Process' && (
                  <Button size="lg" onClick={() => handleUpdateStatus('To Return')} style={{ backgroundColor: '#8B0000', border: 'none', fontWeight: 'bold' }}>
                    Process & Mark as Rented Out
                  </Button>
                )}
                {rental.status === 'To Return' && ( <Button variant="warning" size="lg" onClick={() => handleUpdateStatus('Returned')}>Mark as Returned</Button> )}
                {rental.status === 'Returned' && ( <Alert variant="success" className="text-center">This rental has been completed.</Alert> )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default RentalViewer;