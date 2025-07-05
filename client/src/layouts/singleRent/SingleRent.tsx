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
  Modal,
  Alert,
} from 'react-bootstrap';
import {
  BoxSeam,
  Palette,
  Search,
  Tag,
  ExclamationTriangleFill,
  Hash // Icon for quantity
} from 'react-bootstrap-icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CustomerDetailsCard from '../../components/CustomerDetailsCard';
import { CustomerInfo, InventoryItem, RentalOrder } from '../../types';

const API_URL = 'http://localhost:3001/api';

const initialCustomerDetails: CustomerInfo = { name: '', phoneNumber: '', email: '', address: '' };

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function SingleRent() {
  const navigate = useNavigate();

  // State Management
  const [allProducts, setAllProducts] = useState<InventoryItem[]>([]);
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [selectedVariationKey, setSelectedVariationKey] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1); // <-- NEW STATE FOR QUANTITY
  const [customerDetails, setCustomerDetails] = useState<CustomerInfo>(initialCustomerDetails);
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(true);
  const [existingOpenRental, setExistingOpenRental] = useState<RentalOrder | null>(null);
  const [selectedRentalForDisplay, setSelectedRentalForDisplay] = useState<RentalOrder | null>(null);
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'danger'>('success');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalData, setModalData] = useState({ rentalId: '', itemName: '', quantity: 0 });
  const [showProductSearchResults, setShowProductSearchResults] = useState(false);

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
        const [productsResponse, rentalsResponse] = await Promise.all([ axios.get(`${API_URL}/inventory`), axios.get(`${API_URL}/rentals`) ]);
        setAllProducts(productsResponse.data || []);
        setAllRentals(rentalsResponse.data || []);
      } catch (err) { displayNotification('Failed to load initial data.', 'danger', 0);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ( productSearchResultsRef.current && !productSearchResultsRef.current.contains(event.target as Node) && productSearchInputRef.current && !productSearchInputRef.current.contains(event.target as Node) ) { setShowProductSearchResults(false); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const filteredProducts = useMemo<InventoryItem[]>(() => {
    if (!productSearchTerm.trim()) return [];
    return allProducts.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.category.toLowerCase().includes(productSearchTerm.toLowerCase()));
  }, [productSearchTerm, allProducts]);

  const handleProductSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductSearchTerm(e.target.value);
    setSelectedProduct(null);
    setSelectedVariationKey('');
    setQuantity(1); // Reset quantity
    setShowProductSearchResults(true);
  };

  const handleSelectProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
    setProductSearchTerm(product.name);
    setShowProductSearchResults(false);
    setQuantity(1); // Reset quantity
    const firstAvailableVariation = product.variations.find(v => v.quantity > 0);
    if (firstAvailableVariation) setSelectedVariationKey(`${firstAvailableVariation.color}-${firstAvailableVariation.size}`);
    else setSelectedVariationKey('');
  };

  const handleSelectCustomer = (selectedRental: RentalOrder) => {
    setCustomerDetails(selectedRental.customerInfo[0]);
    setSelectedRentalForDisplay(selectedRental);
    if (selectedRental.status === 'To Process') setExistingOpenRental(selectedRental);
    else setExistingOpenRental(null);
  };

  const currentSelectedVariation = selectedProduct?.variations.find(v => `${v.color}-${v.size}` === selectedVariationKey);
  const displayProductImageUrl = currentSelectedVariation?.imageUrl || selectedProduct?.variations[0]?.imageUrl || 'https://placehold.co/300x450/e9ecef/adb5bd?text=Select+Item';

  const handleCustomerDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({ ...prev, [name]: value }));
  };
  
  const validateForm = () => {
    if (!selectedProduct || !currentSelectedVariation) { displayNotification('Please select a product and its variation.', 'danger'); return false; }
    if (quantity <= 0) { displayNotification('Quantity must be at least 1.', 'danger'); return false; }
    if (currentSelectedVariation.quantity < quantity) { displayNotification('Requested quantity exceeds available stock.', 'danger'); return false; }
    if (!customerDetails.name.trim() || !customerDetails.phoneNumber.trim() || !customerDetails.address.trim()) {
      displayNotification('Please fill all required customer fields (*).', 'danger');
      return false;
    }
    return true;
  };

  const proceedWithAction = (action: 'create' | 'add') => {
    if (action === 'create') {
      if (!isNewCustomerMode && !existingOpenRental) setShowReminderModal(true);
      else createNewRental();
    } else if (action === 'add') {
      addItemToExistingRental();
    }
  };

  const handleFormSubmission = (action: 'create' | 'add') => {
    if (!validateForm()) return;
    proceedWithAction(action);
  };
  
  const createNewRental = async () => {
    setShowReminderModal(false);
    if (!validateForm() || !selectedProduct || !currentSelectedVariation) return;
    setIsSubmitting(true);
    
    try {
      // --- THIS IS THE FIX ---
      // Build the payload in the structure the backend expects.
      const rentalPayload = {
        customerInfo: [customerDetails], // The customer info array
        singleRents: [                   // The singleRents array
          {                              // An object inside the array
            name: `${selectedProduct.name},${currentSelectedVariation.color},${currentSelectedVariation.size}`,
            price: selectedProduct.price,
            quantity: quantity,
            imageUrl: currentSelectedVariation.imageUrl,
            notes: '', // Add notes field if you have one
          },
        ],
      };
      
      // Now the payload matches the backend's expected structure.
      const response = await axios.post(`${API_URL}/rentals`, rentalPayload);
      
      displayNotification('New rental created successfully! Redirecting...', 'success');
      setTimeout(() => navigate(`/rentals/${response.data._id}`), 1500);

    } catch (apiError: any) {
      const errorMessage = apiError.response?.data?.message || "Failed to create rental.";
      displayNotification(errorMessage, 'danger', 0);
    } finally {
      setIsSubmitting(false);
    }
};

  const addItemToExistingRental = async () => {
    if (!validateForm() || !existingOpenRental || !selectedProduct || !currentSelectedVariation) return;
    setIsSubmitting(true);
    
    try {
      // --- THIS IS THE FIX ---
      // Build the payload in the same structure as createNewRental
      const payload = {
        singleRents: [
          {
            name: `${selectedProduct.name},${currentSelectedVariation.color},${currentSelectedVariation.size}`,
            price: selectedProduct.price,
            quantity: quantity,
            imageUrl: currentSelectedVariation.imageUrl,
          },
        ],
      };

      // Now the payload is correctly structured for the backend
      await axios.put(`${API_URL}/rentals/${existingOpenRental._id}/addItem`, payload);
      
      setModalData({ 
          rentalId: existingOpenRental._id, 
          itemName: selectedProduct.name, 
          quantity: quantity // <-- Capture the quantity here
      });
      setShowSuccessModal(true);
      // Reset the form
      setProductSearchTerm(''); 
      setSelectedProduct(null); 
      setSelectedVariationKey(''); 
      setQuantity(1);

    } catch (apiError: any) {
      const errorMessage = apiError.response?.data?.message || "Failed to add item.";
      displayNotification(errorMessage, 'danger', 0);
    } finally {
      setIsSubmitting(false);
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
      {loading ? ( <div className="text-center py-5"><Spinner /></div> ) : (
      <Row className="g-4">
        <Col lg={7} xl={8}>
          <Card className="h-100">
            <Card.Header as="h5" className="d-flex align-items-center"><BoxSeam className="me-2" /> Select Item</Card.Header>
            <Card.Body>
              <Form.Group className="mb-1 position-relative">
                <Form.Label>Search Product</Form.Label>
                <InputGroup>
                  <InputGroup.Text><Search /></InputGroup.Text>
                  <Form.Control ref={productSearchInputRef} type="text" placeholder="Type name or category..." value={productSearchTerm} onChange={handleProductSearchChange} onFocus={() => setShowProductSearchResults(true)} disabled={loading} />
                </InputGroup>
                {showProductSearchResults && productSearchTerm.trim() && (
                  <div ref={productSearchResultsRef}>
                    <ListGroup className="position-absolute w-100" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto', border: '1px solid #dee2e6' }}>
                      {filteredProducts.length > 0 ? filteredProducts.map(p => (
                        <ListGroup.Item action key={p._id} onClick={() => handleSelectProduct(p)}>
                          {p.name} <small className="text-muted">({p.category})</small>
                        </ListGroup.Item>
                      )) : <ListGroup.Item disabled>No products found.</ListGroup.Item>}
                    </ListGroup>
                  </div>
                )}
              </Form.Group>
              <div style={{ minHeight: '1rem' }}></div>
              
              {selectedProduct && (
                <>
                  <Row>
                    <Col md={8}>
                      <Form.Group className="mb-3 mt-3">
                        <Form.Label><Palette className="me-1"/>Variation (Color/Size)</Form.Label>
                        <Form.Select value={selectedVariationKey} onChange={e => setSelectedVariationKey(e.target.value)} required>
                          <option value="">-- Choose a Variation --</option>
                          {selectedProduct.variations.map(v => {
                            const variationKey = `${v.color}-${v.size}`;
                            return ( <option key={variationKey} value={variationKey} disabled={v.quantity <= 0}> {v.color} - {v.size} {v.quantity <= 0 ? '(Out of Stock)' : `(Stock: ${v.quantity})`} </option> );
                          })}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3 mt-3">
                        <Form.Label><Hash className="me-1" />Quantity</Form.Label>
                        <Form.Control 
                            type="number" 
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            min="1"
                            max={currentSelectedVariation?.quantity || 1}
                            disabled={!currentSelectedVariation || currentSelectedVariation.quantity <= 0}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <div className="d-flex justify-content-between align-items-center mt-3 p-2 bg-light border rounded">
                    <h6 className="mb-0 text-muted"><Tag className="me-2" />Total Price</h6>
                    <h5 className="mb-0 text-success fw-bold">₱{(selectedProduct.price * quantity).toFixed(2)}</h5>
                  </div>
                </>
              )}
              <div className="text-center mt-3 mb-2">
                <BsImage src={displayProductImageUrl} alt="Product" fluid thumbnail style={{maxHeight: '250px', objectFit: 'contain'}}/>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5} xl={4}>
           <CustomerDetailsCard
            customerDetails={customerDetails}
            onCustomerDetailChange={handleCustomerDetailChange}
            isNewCustomerMode={isNewCustomerMode}
            onSetIsNewCustomerMode={setIsNewCustomerMode}
            allRentals={allRentals}
            onSelectExisting={handleSelectCustomer}
            onSubmit={handleFormSubmission}
            isSubmitting={isSubmitting}
            canSubmit={!!selectedProduct}
            existingOpenRental={existingOpenRental}
            selectedRentalForDisplay={selectedRentalForDisplay}
          />


        </Col>
      </Row>
      )}

      <Modal show={showReminderModal} onHide={() => setShowReminderModal(false)} centered>
        <Modal.Header closeButton><Modal.Title><ExclamationTriangleFill className="me-2 text-warning" />Create New Rental?</Modal.Title></Modal.Header>
        <Modal.Body>This customer does not have a "To Process" rental. Do you want to create a completely new rental transaction for them?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReminderModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={createNewRental}>Yes, Create New Rental</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSuccessModal} onHide={() => setShowSuccessModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Item Added Successfully</Modal.Title></Modal.Header>
        <Modal.Body><Alert variant="success" className="mb-0">Successfully added <strong>{modalData.quantity} x {modalData.itemName}</strong> to rental ID: <strong>{modalData.rentalId}</strong>.</Alert></Modal.Body>
        <Modal.Footer><Button variant="secondary" onClick={() => setShowSuccessModal(false)}>OK</Button><Button variant="primary" onClick={() => navigate(`/rentals/${modalData.rentalId}`)}>View Rental</Button></Modal.Footer>
      </Modal>
    </Container>
  );
}

export default SingleRent;