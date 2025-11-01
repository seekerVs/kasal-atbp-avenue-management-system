// client/src/layouts/singleRent/SingleRent.tsx

import  { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Button, Card, Image as BsImage, Spinner, Modal, ListGroup, Form } from 'react-bootstrap';
import { BoxSeam, CalendarEvent, ExclamationTriangleFill, PencilSquare, Trash } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

import CustomerDetailsCard from '../../components/CustomerDetailsCard';
import { CustomerInfo, RentalOrder, FormErrors } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { SelectedItemData, SingleItemSelectionModal } from '../../components/modals/singleItemSelectionModal/SingleItemSelectionModal';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { AvailabilityConflictModal } from '../../components/modals/availabilityConflictModal/AvailabilityConflictModal';

const initialCustomerDetails: CustomerInfo = { 
  name: '', phoneNumber: '', email: '', 
  address: { province: 'Camarines Norte', city: '', barangay: '', street: '' } 
};

type ItemToDelete = {
  productId: string;
  variationKey: string;
  name: string;
} | null;

function SingleRent() {
  const navigate = useNavigate();
  const { addAlert } = useAlert();

  const [allRentals, setAllRentals] = useState<RentalOrder[]>([]);
  
  // --- REWIRED STATE: We now store the full selection object ---
  const [selections, setSelections] = useState<SelectedItemData[]>([]);
  
  const [customerDetails, setCustomerDetails] = useState<CustomerInfo>(initialCustomerDetails);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({}); 
  const [itemToEdit, setItemToEdit] = useState<SelectedItemData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete>(null);
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDateChangeWarning, setShowDateChangeWarning] = useState(false);
  const [pendingDateChange, setPendingDateChange] = useState<Date | null>(null);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingItems, setConflictingItems] = useState([]);

  const isCustomerInfoValid = useMemo(() => {
    // Check for a non-empty name and a valid phone number format.
    return customerDetails.name.trim() !== '' && /^09\d{9}$/.test(customerDetails.phoneNumber);
  }, [customerDetails]);


  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [rentalsResponse, unavailableResponse] = await Promise.all([
          api.get('/rentals'),
          api.get('/unavailability')
        ]);
        setAllRentals(rentalsResponse.data || []);
        setUnavailableDates(unavailableResponse.data.map((rec: { date: string }) => new Date(rec.date)));
      } catch (err) { 
        addAlert('Failed to load initial page data.', 'danger');
      } finally { 
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [addAlert]);

  const subtotal = useMemo(() => {
    return selections.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }, [selections]);

  const isSelectableDate = (date: Date): boolean => {
    const day = date.getDay();
    if (day === 0) { // Disable Sundays
      return false;
    }
    // Check if the date is in the unavailableDates array
    const isUnavailable = unavailableDates.some(
      (unavailableDate) => new Date(unavailableDate).toDateString() === date.toDateString()
    );
    return !isUnavailable;
  };

  const handleAddItem = (selection: SelectedItemData) => {
    const newItem = selection;  
    // Check if the exact same item and variation already exists
    const existingItemIndex = selections.findIndex(
      item => item.product._id === newItem.product._id && 
              item.variation.color === newItem.variation.color &&
              item.variation.size === newItem.variation.size
    );

    if (existingItemIndex > -1) {
      // If it exists, just update the quantity
      const updatedSelections = [...selections];
      updatedSelections[existingItemIndex].quantity += newItem.quantity;
      setSelections(updatedSelections);
      addAlert(`Updated quantity for ${newItem.product.name}.`, 'info');
    } else {
      // If it's a new item, add it to the list
      setSelections(prev => [...prev, newItem]);
      // addAlert(`${newItem.product.name} added to rental.`, 'success');
    }

    // After adding, close the modal
    setShowItemModal(false);
  };

  const handleOpenEditor = (item: SelectedItemData) => {
    setItemToEdit(item);
    setShowItemModal(true);
  };

  // --- 4. CREATE HANDLER PENDING THE UPDATED ITEM ---
  const handleItemUpdate = (newSelection: SelectedItemData) => {
    if (!itemToEdit) return;

    // A unique key for a selection instance (product ID + original variation)
    const originalItemKey = `${itemToEdit.product._id}-${itemToEdit.variation.color.hex}-${itemToEdit.variation.size}`;
    
    setSelections(prev => {
        // Remove the original item being edited
        const filtered = prev.filter(s => `${s.product._id}-${s.variation.color.hex}-${s.variation.size}` !== originalItemKey);
        
        // Check if another item with the *new* variation already exists
        const existingIndex = filtered.findIndex(s => 
            s.product._id === newSelection.product._id &&
            s.variation.color.hex === newSelection.variation.color.hex &&
            s.variation.size === newSelection.variation.size
        );

        if (existingIndex > -1) {
            // If it exists, merge quantities
            filtered[existingIndex].quantity += newSelection.quantity;
            addAlert(`Merged quantities for ${newSelection.product.name}.`, 'info');
            return filtered;
        } else {
            // Otherwise, add the new selection to the list
            // addAlert(`${newSelection.product.name} variation updated.`, 'success');
            return [...filtered, newSelection];
        }
    });

    // Clean up
    setShowItemModal(false);
    setItemToEdit(null);
  };

  const handleRemoveItem = (product_id: string, variation_key: string, name: string) => {
    setItemToDelete({ productId: product_id, variationKey: variation_key, name: name });
    setShowDeleteModal(true);
  };

  const handleDateChangeRequest = (newDate: Date | null) => {
    if (!newDate) {
      // Handle the case where the date is cleared, which might also clear items
      setPendingDateChange(null);
      setShowDateChangeWarning(true);
      return;
    }
    
    const hasItems = selections.length > 0;
    const currentDateString = targetDate ? format(targetDate, 'yyyy-MM-dd') : '';
    const newDateString = format(newDate, 'yyyy-MM-dd');

    // Check if the date is actually different AND there are items in the cart
    if (newDateString !== currentDateString && hasItems) {
      setPendingDateChange(newDate);
      setShowDateChangeWarning(true);
    } else {
      // If no items in cart or date is the same, update directly
      setTargetDate(newDate);
    }
  };

  const handleConfirmDateChange = () => {
    setTargetDate(pendingDateChange); // Set the new date
    setSelections([]); // Clear the items
    
    // Clean up state
    setShowDateChangeWarning(false);
    setPendingDateChange(null);
  };

  const confirmRemoveItem = () => {
    if (!itemToDelete) return;
    
    setSelections(prev => prev.filter(item => 
      !(item.product._id === itemToDelete.productId && `${item.variation.color.hex}-${item.variation.size}` === itemToDelete.variationKey)
    ));
    
    setShowDeleteModal(false);
    setItemToDelete(null);
  };

  const handleSelectCustomer = (selectedRental: RentalOrder) => {
    setCustomerDetails(selectedRental.customerInfo[0]);
  };
  
  const validateForm = () => {
    const newErrors: FormErrors = { address: {} };
    if (selections.length === 0) {
      addAlert('Please select an item to rent.', 'danger');
      return false; // Stop early for this case
    }
    if (!customerDetails.name.trim()) newErrors.name = 'Customer Name is required.';
    if (!/^09\d{9}$/.test(customerDetails.phoneNumber)) newErrors.phoneNumber = 'Phone number must be a valid 11-digit number starting with 09.';
    if (!customerDetails.address.province) newErrors.address.province = 'Province is required.';
    if (!customerDetails.address.city) newErrors.address.city = 'City/Municipality is required.';
    if (!customerDetails.address.barangay) newErrors.address.barangay = 'Barangay is required.';
    if (!customerDetails.address.street.trim()) newErrors.address.street = 'Street, House No. is required.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 1 && Object.keys(newErrors.address).length === 0;
  };

  const createRentalPayload = () => {
    if (selections.length === 0 || !targetDate) return null; // Add a check for targetDate

    // Calculate the end date based on the targetDate
    const startDate = targetDate;
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 3); // Default 4-day rental period

    const singleRentsData = selections.map(selection => {
      const { product, variation, quantity } = selection;
      return {
        itemId: product._id,
        name: product.name,
        variation: variation,
        price: product.price,
        quantity: quantity,
        imageUrl: variation.imageUrls[0] || '',
      };
    });

    return {
      customerInfo: [customerDetails],
      singleRents: singleRentsData,
      // --- ADD THESE NEW DATE FIELDS ---
      rentalStartDate: format(startDate, 'yyyy-MM-dd'),
      rentalEndDate: format(endDate, 'yyyy-MM-dd'),
    };
  };

  const handleFormSubmission = () => {
    if (!validateForm()) return;
    createNewRental();
  };
  
  const createNewRental = async () => {
    const rentalPayload = createRentalPayload(); // This now includes the dates
    if (!rentalPayload) {
      addAlert("Missing rental data. Please select items and a date.", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await api.post('/rentals', rentalPayload);
      addAlert('New rental created successfully! Redirecting...', 'success');
      setTimeout(() => navigate(`/rentals/${response.data._id}`), 1500);
    } catch (err: any) {
      if (err.response && err.response.status === 409) {
        setConflictingItems(err.response.data.conflictingItems || []);
        setShowConflictModal(true);
        addAlert('Some items are no longer available. Please review your list.', 'danger');
      } else {
        addAlert(err.response?.data?.message || "Failed to create rental.", 'danger');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Outfit Rent</h2>
      {loading ? ( <div className="text-center py-5"><Spinner /></div> ) : (

        <Row className="g-4">
          {/* --- LEFT COLUMN: DATE & ITEMS --- */}
          <Col lg={6} xl={7}>
            {/* Step 2: Select Rental Date */}
            <Card className="mb-4">
              <Card.Header as="h5">
                <CalendarEvent className="me-2" />Select Rental Start Date
              </Card.Header>
              <Card.Body>
                <Form.Group>
                  <Form.Label>The 4-day rental period will begin on this date.</Form.Label>
                  <DatePicker
                    selected={targetDate}
                    onChange={handleDateChangeRequest}
                    minDate={new Date()}
                    className="form-control"
                    placeholderText="Select date..." 
                    isClearable
                    dateFormat="MMMM d, yyyy"
                    wrapperClassName="w-100"
                    disabled={!isCustomerInfoValid}
                    filterDate={isSelectableDate}
                  />
                </Form.Group>
              </Card.Body>
            </Card>

            {/* Step 3: Selected Items */}
            <Card>
              <Card.Header as="h5" className="d-flex align-items-center"><BoxSeam className="me-2" /> Selected Items</Card.Header>
              <Card.Body className="d-flex flex-column">
                {selections.length > 0 ? (
                  <>
                    <ListGroup variant="flush" className="flex-grow-1" style={{ overflowY: 'auto', maxHeight: '400px' }}>
                      {selections.map((item) => {
                        const variationKey = `${item.variation.color.hex}-${item.variation.size}`;
                        return (
                          <ListGroup.Item key={`${item.product._id}-${variationKey}`} className="px-2 py-3 border-bottom">
                            <Row className="align-items-center gx-0">
                              <Col xs="auto">
                                <BsImage src={item.variation.imageUrls[0] || 'https://placehold.co/80x80'} thumbnail style={{ width: '80px', height: '80px', objectFit: 'cover', marginRight:'1rem' }} />
                              </Col>
                              <Col>
                                <p className="fw-bold mb-1">{item.product.name}</p>
                                <p className="text-muted small mb-0">Variation: {item.variation.color.name} - {item.variation.size}</p>
                                <p className="text-muted small mb-0">Qty: {item.quantity}</p>
                              </Col>
                              <Col xs="auto" className="text-end">
                                <p className="fw-bold h5 text-success mb-2">₱{(item.product.price * item.quantity).toLocaleString()}</p>
                                <>
                                  <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => handleOpenEditor(item)}><PencilSquare /></Button>
                                  <Button variant="outline-danger" size="sm" onClick={() => handleRemoveItem(item.product._id, variationKey, item.product.name)}><Trash /></Button>
                                </>
                              </Col>
                            </Row>
                          </ListGroup.Item>
                        );
                      })}
                    </ListGroup>
                    <hr />
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Subtotal:</h5>
                      <h5 className="mb-0 text-danger fw-bold">₱{subtotal.toLocaleString()}</h5>
                    </div>
                    <Button variant="outline-primary" onClick={() => setShowItemModal(true)} disabled={!targetDate}>
                      Add More Items...
                    </Button>
                  </>
                ) : (
                  <div className="text-center my-auto p-5">
                    <p className="text-muted fs-5">Your rental list is empty.</p>
                    <Button onClick={() => setShowItemModal(true)} disabled={!targetDate}>
                      Select an outfit to rent
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* --- RIGHT COLUMN: CUSTOMER DETAILS --- */}
          <Col lg={6} xl={5}>
            <CustomerDetailsCard
              customerDetails={customerDetails}
              setCustomerDetails={setCustomerDetails}
              allRentals={allRentals}
              onSelectExisting={handleSelectCustomer}
              onSubmit={handleFormSubmission}
              isSubmitting={isSubmitting}
              canSubmit={isCustomerInfoValid && !!targetDate && selections.length > 0}
              errors={errors} 
            />
          </Col>
        </Row>

      )}

      <SingleItemSelectionModal
        show={showItemModal}
        onHide={() => { setShowItemModal(false); setItemToEdit(null); }}
        onSelect={itemToEdit ? handleItemUpdate : handleAddItem}
        addAlert={addAlert}
        mode="rental"
        preselectedItemId={itemToEdit?.product._id}
        preselectedVariation={itemToEdit ? `${itemToEdit.variation.color.name}, ${itemToEdit.variation.size}` : undefined}
        initialDate={targetDate}
        isDateDisabled={true}
      />

      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Removal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove <strong>{itemToDelete?.name}</strong> from the list?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button onClick={confirmRemoveItem}>
            Remove
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDateChangeWarning} onHide={() => setShowDateChangeWarning(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <ExclamationTriangleFill className="me-2 text-warning" />
            Change Rental Date?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Changing the rental date will clear all items from your current selection. This is to ensure item availability can be re-verified for the new date.</p>
          <p className="mb-0">Are you sure you want to proceed?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDateChangeWarning(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleConfirmDateChange}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>

      <AvailabilityConflictModal
        show={showConflictModal}
        onHide={() => setShowConflictModal(false)}
        conflictingItems={conflictingItems}
      />
    </Container>
  );
}

export default SingleRent;