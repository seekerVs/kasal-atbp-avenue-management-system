import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  Image as BsImage,
  ListGroup,
  Spinner,
  InputGroup,
  Toast,
  ToastContainer,
  Badge,
  Modal,
  Alert,
} from 'react-bootstrap';
import {
  PersonFill,
  BoxSeam,
  Palette,
  CreditCard,
  PlusCircle,
  Search,
  TelephoneFill,
  GeoAltFill,
  Tag,
  PeopleFill,
  ExclamationTriangleFill,
} from 'react-bootstrap-icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// ===================================================================================
// --- TYPE DEFINITIONS ---
// ===================================================================================
interface ItemVariation {
  color: string;
  size: string;
  quantity: number;
  imageUrl: string;
}
interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  variations: ItemVariation[];
}
interface CustomerDetails {
  name: string;
  phoneNumber: string;
  email: string;
  address: string;
}
interface RentalOrder {
  _id: string;
  customerInfo: CustomerDetails[];
  status: string;
  createdAt: string;
}

const API_URL = 'http://localhost:3001/api';

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function SingleRent() {
  const navigate = useNavigate();

  // State Management
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariationKey, setSelectedVariationKey] = useState<string>('');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({ name: '', phoneNumber: '', email: '', address: '' });
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(true);
  const [existingOpenRental, setExistingOpenRental] = useState<RentalOrder | null>(null);
  const [selectedRentalForDisplay, setSelectedRentalForDisplay] = useState<RentalOrder | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'danger'>('success');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalData, setModalData] = useState({ rentalId: '', itemName: '' });
  const [showProductSearchResults, setShowProductSearchResults] = useState(false);

  // Refs
  const productSearchResultsRef = useRef<HTMLDivElement>(null);
  const productSearchInputRef = useRef<HTMLInputElement>(null);

  const displayNotification = (message: string, type: 'success' | 'danger' = 'success', duration: number = 3000) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    if (type === 'success' && duration > 0) setTimeout(() => setShowNotification(false), duration);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsResponse, rentalsResponse] = await Promise.all([
          axios.get(`${API_URL}/inventory`),
          axios.get(`${API_URL}/rentals`)
        ]);
        setAllProducts(productsResponse.data || []);
        setAllRentals(rentalsResponse.data || []);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        displayNotification('Failed to load initial data.', 'danger', 0);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        productSearchResultsRef.current && !productSearchResultsRef.current.contains(event.target as Node) &&
        productSearchInputRef.current && !productSearchInputRef.current.contains(event.target as Node)
      ) {
        setShowProductSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const filteredProducts = useMemo<Product[]>(() => {
    if (!productSearchTerm.trim()) return [];
    return allProducts.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.category.toLowerCase().includes(productSearchTerm.toLowerCase()));
  }, [productSearchTerm, allProducts]);

  const filteredRentals = useMemo<RentalOrder[]>(() => {
    if (!customerSearchTerm.trim()) return [];
    const term = customerSearchTerm.toLowerCase();
    return allRentals.filter(rental => {
      const customer = rental.customerInfo?.[0];
      if (!customer) return false;
      return (
        customer.name.toLowerCase().includes(term) || 
        customer.phoneNumber.includes(term) ||
        rental._id.toLowerCase().includes(term)
      );
    });
  }, [customerSearchTerm, allRentals]);

  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearchTerm(e.target.value);
    setSelectedProduct(null);
    setSelectedVariationKey('');
    setShowProductSearchResults(true);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductSearchTerm(product.name);
    setShowProductSearchResults(false);
    const firstAvailableVariation = product.variations.find(v => v.quantity > 0);
    if (firstAvailableVariation) {
      setSelectedVariationKey(`${firstAvailableVariation.color}-${firstAvailableVariation.size}`);
    } else {
      setSelectedVariationKey('');
    }
  };

  const handleSelectCustomer = (selectedRental: RentalOrder) => {
    const customer = selectedRental.customerInfo[0];
    setCustomerDetails(customer);
    setCustomerSearchTerm('');
    setSelectedRentalForDisplay(selectedRental);
    
    if (selectedRental.status === 'To Process') {
      setExistingOpenRental(selectedRental);
    } else {
      setExistingOpenRental(null);
    }
  };

  const handleToggleNewCustomer = () => {
    setIsNewCustomerMode(!isNewCustomerMode);
    setCustomerDetails({ name: '', phoneNumber: '', email: '', address: '' });
    setCustomerSearchTerm('');
    setExistingOpenRental(null);
    setSelectedRentalForDisplay(null);
  };

  const currentSelectedVariation = selectedProduct?.variations.find(v => `${v.color}-${v.size}` === selectedVariationKey);
  const displayProductImageUrl = currentSelectedVariation?.imageUrl || 'https://placehold.co/300x450/e9ecef/adb5bd?text=Select+Item';

  const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const validateForm = () => {
    if (!selectedProduct || !currentSelectedVariation) { displayNotification('Please select a product and its variation.', 'danger'); return false; }
    if (currentSelectedVariation.quantity <= 0) { displayNotification('Selected variation is out of stock.', 'danger'); return false; }
    if (!customerDetails.name.trim() || !customerDetails.phoneNumber.trim() || !customerDetails.address.trim()) {
      displayNotification('Please fill all required customer fields (*).', 'danger');
      return false;
    }
    return true;
  };
  
  const createNewRental = async () => {
    if (!validateForm()) return;
    setShowReminderModal(false);
    if (!selectedProduct || !currentSelectedVariation) return;
    try {
      const rentalPayload = {
        itemId: selectedProduct._id,
        color: currentSelectedVariation.color,
        size: currentSelectedVariation.size,
        customerInfo: [customerDetails],
      };
      const response = await axios.post(`${API_URL}/rentals`, rentalPayload);
      displayNotification('New rental created successfully! Redirecting...', 'success');
      setTimeout(() => navigate(`/rentals/${response.data._id}`), 1500);
    } catch (apiError: any) {
      displayNotification(apiError.response?.data?.message || "Failed to create rental.", 'danger', 0);
    }
  };

  const handleFinalizeRental = () => {
    if (!validateForm()) return;
    if (!isNewCustomerMode && existingOpenRental) {
      setShowReminderModal(true);
    } else {
      createNewRental();
    }
  };

  const handleAddItemToExistingRental = async () => {
    if (!validateForm() || !existingOpenRental) {
      displayNotification("No item selected or no existing rental found for this customer.", 'danger');
      return;
    }
    try {
      if (!selectedProduct || !currentSelectedVariation) return;
      const payload = { itemId: selectedProduct._id, color: currentSelectedVariation.color, size: currentSelectedVariation.size };
      await axios.put(`${API_URL}/rentals/${existingOpenRental._id}/addItem`, payload);
      setModalData({ rentalId: existingOpenRental._id, itemName: selectedProduct.name });
      setShowSuccessModal(true);
      setProductSearchTerm(''); setSelectedProduct(null); setSelectedVariationKey('');
    } catch (apiError: any) {
      displayNotification(apiError.response?.data?.message || "Failed to add item.", 'danger', 0);
    }
  };

  return (
    <Container fluid>
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 1056 }}>
        <Toast onClose={() => setShowNotification(false)} show={showNotification} delay={3000} autohide={notificationType === 'success'} bg={notificationType} className="text-white">
          <Toast.Header><strong className="me-auto text-capitalize">{notificationType}</strong></Toast.Header>
          <Toast.Body>{notificationMessage}</Toast.Body>
        </Toast>
      </ToastContainer>
      <h2 className="mb-4">Single Item Rent</h2>
      <Row>
        <Col md={5} lg={4}>
          <Card className="mb-4">
            <Card.Header as="h5" className="d-flex align-items-center"><BoxSeam className="me-2" /> Select Item</Card.Header>
            <Card.Body>
              <Form.Group className="mb-1 product-search-input-group">
                <Form.Label>Search Product</Form.Label>
                <InputGroup>
                  <InputGroup.Text><Search /></InputGroup.Text>
                  <Form.Control ref={productSearchInputRef} type="text" placeholder="Type name or category..." value={productSearchTerm} onChange={handleProductSearchChange} onFocus={() => setShowProductSearchResults(true)} disabled={loading} />
                </InputGroup>
              </Form.Group>
              {showProductSearchResults && productSearchTerm.trim() && (
                <div ref={productSearchResultsRef}>
                  <ListGroup className="product-search-results mb-3" style={{ maxHeight: '200px', overflowY: 'auto', position: 'absolute', zIndex: 1000, width: 'calc(100% - 2rem)', border: '1px solid #dee2e6' }}>
                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                      <ListGroup.Item action key={p._id} onClick={() => handleSelectProduct(p)}>
                        {p.name} <small className="text-muted">({p.category})</small>
                      </ListGroup.Item>
                    )) : <ListGroup.Item disabled>No products found.</ListGroup.Item>}
                  </ListGroup>
                </div>
              )}
              <div style={{minHeight: showProductSearchResults && productSearchTerm.trim() ? '20px' : '0'}}></div>
              {selectedProduct && (
                <>
                  <Form.Group className="mb-3 mt-3">
                    <Form.Label><Palette className="me-1"/>Variation (Color/Size)</Form.Label>
                    <Form.Select value={selectedVariationKey} onChange={e => setSelectedVariationKey(e.target.value)} required>
                      <option value="">-- Choose a Variation --</option>
                      {selectedProduct.variations.map(v => {
                        const syntheticKey = `${v.color}-${v.size}`;
                        return (<option key={syntheticKey} value={syntheticKey} disabled={v.quantity <= 0}>
                          {v.color} - {v.size} {v.quantity <= 0 ? '(Out of Stock)' : `(Stock: ${v.quantity})`}
                        </option>);
                      })}
                    </Form.Select>
                  </Form.Group>
                  <div className="d-flex justify-content-between align-items-center mt-3 p-2 bg-light border rounded">
                    <h6 className="mb-0 text-muted"><Tag className="me-2" />Rental Price</h6>
                    <h5 className="mb-0 text-success fw-bold">₱{selectedProduct.price.toFixed(2)}</h5>
                  </div>
                </>
              )}
              <div className="text-center mt-3 mb-2">
                <BsImage src={displayProductImageUrl} alt="Product" fluid thumbnail style={{maxHeight: '250px', objectFit: 'contain'}}/>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={7} lg={8}>
          <Card className="mb-4">
            <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
              <div><PersonFill className="me-2" />Customer Details</div>
              <Button variant="outline-secondary" size="sm" onClick={handleToggleNewCustomer} disabled={loading}>
                {isNewCustomerMode ? 'Select Existing' : 'Enter New'}
              </Button>
            </Card.Header>
            <Card.Body className="p-4">
              {isNewCustomerMode ? (
                <>
                  <Row>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Customer Name <span className="text-danger">*</span></Form.Label><Form.Control type="text" name="name" value={customerDetails.name} onChange={handleCustomerChange} required /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label><TelephoneFill className="me-1"/>Contact Number <span className="text-danger">*</span></Form.Label><Form.Control type="text" name="phoneNumber" value={customerDetails.phoneNumber} onChange={handleCustomerChange} required /></Form.Group></Col>
                  </Row>
                  <Row>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Email (Optional)</Form.Label><Form.Control type="email" name="email" value={customerDetails.email} onChange={handleCustomerChange} /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label><GeoAltFill className="me-1"/>Address <span className="text-danger">*</span></Form.Label><Form.Control type="text" name="address" value={customerDetails.address} onChange={handleCustomerChange} required /></Form.Group></Col>
                  </Row>
                </>
              ) : (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label><PeopleFill className="me-2" />Search Existing Rental</Form.Label>
                    <Form.Control type="text" placeholder="Type name, phone, or rental ID..." value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} />
                  </Form.Group>
                  {customerSearchTerm && (
                    <ListGroup className="mb-3" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {filteredRentals.length > 0 ? filteredRentals.map(rental => {
                        const cust = rental.customerInfo[0];
                        return (
                          <ListGroup.Item action key={rental._id} onClick={() => handleSelectCustomer(rental)}>
                            <div className="d-flex justify-content-between">
                              <span className="fw-bold">{cust.name}</span>
                              <small className="text-muted">Rental ID: {rental._id}</small>
                            </div>
                            <div className="text-muted small">
                              {cust.phoneNumber}
                              <span className="ms-2 fst-italic">
                                (Created: {new Date(rental.createdAt).toLocaleDateString()})
                              </span>
                            </div>
                          </ListGroup.Item>
                        );
                      }) : <ListGroup.Item disabled>No matching rentals found.</ListGroup.Item>}
                    </ListGroup>
                  )}
                  {selectedRentalForDisplay && !customerSearchTerm && (
                    <Card body className="mb-3 bg-light">
                       <div className="d-flex justify-content-between">
                          <span className="fw-bold">{selectedRentalForDisplay.customerInfo[0].name}</span>
                          <small className="text-muted">Rental ID: {selectedRentalForDisplay._id}</small>
                        </div>
                        <div className="text-muted small">
                          {selectedRentalForDisplay.customerInfo[0].phoneNumber}
                          <span className="ms-2 fst-italic">
                            (Created: {new Date(selectedRentalForDisplay.createdAt).toLocaleDateString()})
                          </span>
                        </div>
                    </Card>
                  )}
                  {existingOpenRental && <Alert variant="info">This customer has a rental "To Process".</Alert>}
                </>
              )}
              <hr />
              <div className="d-grid gap-2 mt-4">
                {!isNewCustomerMode && existingOpenRental && (
                  <Button variant="info" size="lg" onClick={handleAddItemToExistingRental} disabled={!selectedProduct || loading}>
                    <PlusCircle className="me-2" />Add to Existing Rental
                  </Button>
                )}
                <Button size="lg" onClick={handleFinalizeRental} disabled={!selectedProduct || loading}>
                  <CreditCard className="me-2" /> Finalize as New Rental
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showReminderModal} onHide={() => setShowReminderModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title><ExclamationTriangleFill className="me-2 text-warning" />Customer Has Open Rental</Modal.Title>
        </Modal.Header>
        <Modal.Body>This customer has a rental "To Process". Are you sure you want to create a separate new rental transaction?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReminderModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={createNewRental}>Yes, Create New Rental</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Item Added Successfully</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success" className="mb-0">Successfully added <strong>{modalData.itemName}</strong> to rental ID: <strong>{modalData.rentalId}</strong>.</Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSuccessModal(false)}>OK</Button>
          <Button variant="primary" onClick={() => navigate(`/rentals/${modalData.rentalId}`)}>View Rental</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default SingleRent;