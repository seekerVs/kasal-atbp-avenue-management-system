import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  ListGroup,
  Spinner,
  Alert,
  Badge,
  Image as BsImage,
  Modal,
} from 'react-bootstrap';
import {
  PersonFill,
  BoxSeam,
  CreditCard,
  PeopleFill,
  Search,
  TelephoneFill,
  GeoAltFill,
  PlusCircle,
  ExclamationTriangleFill,
} from 'react-bootstrap-icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// ===================================================================================
// --- TYPE DEFINITIONS ---
// ===================================================================================
interface Package {
  _id: string;
  name: string;
  descripton?: string | null;
  inlusions: string[];
  price: number;
  imageUrl: string;
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
function PackageRent() {
  const navigate = useNavigate();

  // State Management
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>('');
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({ name: '', phoneNumber: '', email: '', address: '' });
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(true);
  
  const [existingOpenRental, setExistingOpenRental] = useState<RentalOrder | null>(null);
  const [selectedRentalForDisplay, setSelectedRentalForDisplay] = useState<RentalOrder | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalData, setModalData] = useState({ rentalId: '', itemName: '' });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [packagesResponse, rentalsResponse] = await Promise.all([
          axios.get(`${API_URL}/packages`),
          axios.get(`${API_URL}/rentals`),
        ]);
        setAllPackages(packagesResponse.data || []);
        setAllRentals(rentalsResponse.data || []);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const selectedPackage = useMemo(() => {
    return allPackages.find(p => p._id === selectedPackageId);
  }, [selectedPackageId, allPackages]);

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
  
  const handleSelectCustomer = (selectedRental: RentalOrder) => {
    const customer = selectedRental.customerInfo[0];
    setCustomerDetails(customer);
    setCustomerSearchTerm(''); // Clear search term to hide the list
    setSelectedRentalForDisplay(selectedRental); // Set the rental to be displayed
    
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

  const validateForm = () => {
    if (!selectedPackageId) { setError("Please select a package."); return false; }
    if (!customerDetails.name.trim() || !customerDetails.phoneNumber.trim()) { setError("Customer Name and Phone Number are required."); return false; }
    setError(null);
    return true;
  };

  const createNewRental = async () => {
    if (!validateForm()) return;
    setShowReminderModal(false);
    try {
      const rentalPayload = { packageId: selectedPackageId, customerInfo: [customerDetails] };
      const response = await axios.post(`${API_URL}/rentals`, rentalPayload);
      navigate(`/rentals/${response.data._id}`);
    } catch (apiError: any) {
      setError(apiError.response?.data?.message || "Failed to create package rental.");
    }
  };

  const handleFinalizeRental = () => {
    if (!validateForm()) return;
    // The reminder modal logic is now simpler: it triggers if you're trying to create a new rental
    // for a customer who was selected from the list (and might have an open rental).
    if (!isNewCustomerMode && existingOpenRental) {
      setShowReminderModal(true);
    } else {
      createNewRental();
    }
  };

  const handleAddItemToExistingRental = async () => {
    if (!validateForm() || !existingOpenRental) { setError("No package selected or no existing rental found."); return; }
    try {
      const payload = { packageId: selectedPackageId };
      await axios.put(`${API_URL}/rentals/${existingOpenRental._id}/addItem`, payload);
      setModalData({ rentalId: existingOpenRental._id, itemName: selectedPackage?.name || 'Package' });
      setShowSuccessModal(true);
      setSelectedPackageId('');
    } catch (apiError: any) {
      setError(apiError.response?.data?.message || "Failed to add item to rental.");
    }
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Create Package Rental</h2>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {loading ? ( <div className="text-center py-5"><Spinner /></div> ) : (
      <Row>
        <Col md={5} lg={4}>
          <Card className="mb-4">
            <Card.Header as="h5"><BoxSeam className="me-2" />Select Package</Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Label>Available Packages</Form.Label>
                <Form.Select value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}>
                  <option value="">-- Choose a Package --</option>
                  {allPackages.map(pkg => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} - ₱{pkg.price.toLocaleString()}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              
              {selectedPackage && (
                <div className="mt-4">
                  <div className="text-center mb-3">
                    <BsImage src={selectedPackage.imageUrl} alt={selectedPackage.name} fluid thumbnail style={{ maxHeight: '200px', objectFit: 'cover' }} />
                  </div>
                  <h4>{selectedPackage.name}</h4>
                  {selectedPackage.descripton && <p className="text-muted fst-italic">{selectedPackage.descripton}</p>}
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center fw-bold">
                        Inclusions:
                        <Badge bg="success" pill>₱{selectedPackage.price.toLocaleString()}</Badge>
                    </ListGroup.Item>
                    {selectedPackage.inlusions.map((item, index) => (<ListGroup.Item key={index}>{item}</ListGroup.Item>))}
                  </ListGroup>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={7} lg={8}>
          <Card>
            <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
              <div><PersonFill className="me-2" />Customer Details</div>
              <Button variant="outline-secondary" size="sm" onClick={handleToggleNewCustomer}>
                {isNewCustomerMode ? 'Select Existing' : 'Enter New'}
              </Button>
            </Card.Header>
            <Card.Body className="p-4">
              {isNewCustomerMode ? (
                 <>
                  <Row>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Customer Name <span className="text-danger">*</span></Form.Label><Form.Control type="text" name="name" value={customerDetails.name} onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})} required /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label><TelephoneFill className="me-1"/>Contact Number <span className="text-danger">*</span></Form.Label><Form.Control type="text" name="phoneNumber" value={customerDetails.phoneNumber} onChange={(e) => setCustomerDetails({...customerDetails, phoneNumber: e.target.value})} required /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label>Email (Optional)</Form.Label><Form.Control type="email" name="email" value={customerDetails.email} onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})} /></Form.Group></Col>
                    <Col md={6}><Form.Group className="mb-3"><Form.Label><GeoAltFill className="me-1"/>Address <span className="text-danger">*</span></Form.Label><Form.Control type="text" name="address" value={customerDetails.address} onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})} required /></Form.Group></Col>
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
                  <Button variant="info" size="lg" onClick={handleAddItemToExistingRental} disabled={!selectedPackageId}>
                    <PlusCircle className="me-2" />Add to Existing Rental
                  </Button>
                )}
                <Button variant="primary" size="lg" onClick={handleFinalizeRental} disabled={!selectedPackageId || !customerDetails.name}>
                    <CreditCard className="me-2" />Finalize as New Rental
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      )}

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
          <Modal.Title>Package Added Successfully</Modal.Title>
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

export default PackageRent;