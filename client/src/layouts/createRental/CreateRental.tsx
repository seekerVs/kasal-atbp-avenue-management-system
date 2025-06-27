import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  InputGroup,
  Alert,
} from 'react-bootstrap';
import { BoxArrowUpRight, ListCheck, PeopleFill, CashCoin } from 'react-bootstrap-icons';

// Define a type for your form data for better type safety
interface RentalFormData {
  customerName: string;
  customerContact: string;
  rentalStartDate: string;
  rentalEndDate: string;
  selectedPackage: string;
  rentalFee: number | '';
  securityDeposit: number | '';
  paymentStatus: 'Unpaid' | 'Deposit Paid' | 'Fully Paid';
  notes: string;
}

// --- Main Component ---
function CreateRental() {
  const [formData, setFormData] = useState<RentalFormData>({
    customerName: '',
    customerContact: '',
    rentalStartDate: '',
    rentalEndDate: '',
    selectedPackage: '',
    rentalFee: '',
    securityDeposit: '',
    paymentStatus: 'Unpaid',
    notes: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // A generic handler to update form state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // --- Form Validation Example ---
    if (!formData.customerName || !formData.rentalStartDate || !formData.selectedPackage) {
      setError('Please fill out all required fields: Customer Name, Start Date, and Package.');
      return;
    }

    // --- TODO: API Call ---
    // Here you would send the `formData` to your backend API
    // For example: axios.post('/api/rentals', formData)
    console.log('Form Submitted:', formData);

    // On success from API:
    setSuccess('Rental created successfully!');
    // Optionally reset the form
    // setFormData({ ...initial state ... });
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Create New Rental</h2>
      
      <Card>
        <Card.Header as="h5" className="d-flex align-items-center">
          <ListCheck className="me-2" />
          Rental Details
        </Card.Header>
        <Card.Body>
          {/* --- ALERTS for feedback --- */}
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Form onSubmit={handleSubmit}>
            {/* === CUSTOMER INFORMATION SECTION === */}
            <h4 className="mt-2 mb-3"><PeopleFill className="me-2" />Customer Information</h4>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="customerName">
                  <Form.Label>Customer Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="customerContact">
                  <Form.Label>Contact Number or Email</Form.Label>
                  <Form.Control
                    type="text"
                    name="customerContact"
                    value={formData.customerContact}
                    onChange={handleChange}
                    placeholder="e.g., 0917... or email@example.com"
                  />
                </Form.Group>
              </Col>
            </Row>

            <hr />

            {/* === RENTAL DETAILS SECTION === */}
            <h4 className="mt-4 mb-3"><CashCoin className="me-2" />Rental & Payment Details</h4>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="selectedPackage">
                  <Form.Label>Product / Package</Form.Label>
                  <Form.Select
                    name="selectedPackage"
                    value={formData.selectedPackage}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select a package --</option>
                    <option value="package1">Gown Package A</option>
                    <option value="package2">Suit Package B</option>
                    <option value="item123">Individual Item: Classic Tuxedo</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                 <Form.Group className="mb-3" controlId="paymentStatus">
                  <Form.Label>Payment Status</Form.Label>
                  <Form.Select
                    name="paymentStatus"
                    value={formData.paymentStatus}
                    onChange={handleChange}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Deposit Paid">Deposit Paid</option>
                    <option value="Fully Paid">Fully Paid</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3" controlId="rentalStartDate">
                  <Form.Label>Rental Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="rentalStartDate"
                    value={formData.rentalStartDate}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3" controlId="rentalEndDate">
                  <Form.Label>Rental End Date (Return)</Form.Label>
                  <Form.Control
                    type="date"
                    name="rentalEndDate"
                    value={formData.rentalEndDate}
                    onChange={handleChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
               <Col md={6}>
                <Form.Group className="mb-3" controlId="rentalFee">
                  <Form.Label>Rental Fee</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>₱</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="rentalFee"
                      value={formData.rentalFee}
                      onChange={handleChange}
                      placeholder="e.g., 1500"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3" controlId="securityDeposit">
                  <Form.Label>Security Deposit</Form.Label>
                   <InputGroup>
                    <InputGroup.Text>₱</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="securityDeposit"
                      value={formData.securityDeposit}
                      onChange={handleChange}
                      placeholder="e.g., 500"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3" controlId="notes">
              <Form.Label>Notes / Special Instructions</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="e.g., Customer requested specific alteration."
              />
            </Form.Group>

            {/* === FORM ACTIONS === */}
            <div className="d-flex justify-content-end mt-4">
              <Button variant="outline-secondary" type="button" className="me-2">
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create Rental <BoxArrowUpRight className="ms-1" />
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default CreateRental;