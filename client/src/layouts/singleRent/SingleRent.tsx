// client/src/layouts/singleRent/SingleRent.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Button, Card, Image as BsImage, Spinner, Alert, Modal, ListGroup } from 'react-bootstrap';
import { BoxSeam, Tag, ExclamationTriangleFill, Hash, Palette, PencilSquare, Trash } from 'react-bootstrap-icons';
import { useNavigate } from 'react-router-dom';

import CustomerDetailsCard from '../../components/CustomerDetailsCard';
import { CustomerInfo, RentalOrder, FormErrors } from '../../types';
import api from '../../services/api';
import { useAlert } from '../../contexts/AlertContext';
import { SelectedItemData, SingleItemSelectionModal } from '../../components/modals/singleItemSelectionModal/SingleItemSelectionModal';

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
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(true);
  const [existingOpenRental, setExistingOpenRental] = useState<RentalOrder | null>(null);
  const [selectedRentalForDisplay, setSelectedRentalForDisplay] = useState<RentalOrder | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalData, setModalData] = useState({ rentalId: '', itemName: '', quantity: 0 });
  const [errors, setErrors] = useState<FormErrors>({}); 
  const [itemToEdit, setItemToEdit] = useState<SelectedItemData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemToDelete>(null);


  useEffect(() => {
    // This effect now only fetches data not related to the inventory, like all rentals for the customer search.
    const fetchRentalData = async () => {
      setLoading(true); // Keep the main page loader for this initial fetch
      try {
        const rentalsResponse = await api.get('/rentals');
        setAllRentals(rentalsResponse.data || []);
      } catch (err) { 
        addAlert('Failed to load initial rental data.', 'danger');
      } finally { 
        setLoading(false);
      }
    };
    fetchRentalData();
  }, [addAlert]);

  const subtotal = useMemo(() => {
    return selections.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  }, [selections]);

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
    setSelectedRentalForDisplay(selectedRental);
    setExistingOpenRental(selectedRental.status === 'Pending' ? selectedRental : null);
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
    if (selections.length === 0) return null;

    // Map over the 'selections' state, which already holds the structured data we need.
    const singleRentsData = selections.map(selection => {
      const { product, variation, quantity } = selection;
      return {
        itemId: product._id,
        name: product.name,
        variation: variation, // Pass the whole variation object
        price: product.price,
        quantity: quantity,
        imageUrl: variation.imageUrl,
      };
    });

    return {
      customerInfo: [customerDetails],
      singleRents: singleRentsData,
    };
  };

  const handleFormSubmission = (action: 'create' | 'add') => {
    if (!validateForm()) return;

    if (action === 'create' && !isNewCustomerMode && !existingOpenRental) {
      setShowReminderModal(true);
    } else if (action === 'add' && existingOpenRental) {
      addItemToExistingRental();
    } else {
      createNewRental();
    }
  };
  
  const createNewRental = async () => {
    setShowReminderModal(false);
    const rentalPayload = createRentalPayload();
    if (!rentalPayload) return;
    setIsSubmitting(true);
    try {
      const response = await api.post('/rentals', rentalPayload);
      addAlert('New rental created successfully! Redirecting...', 'success');
      setTimeout(() => navigate(`/rentals/${response.data._id}`), 1500);
    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to create rental.", 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItemToExistingRental = async () => {
    const payload = createRentalPayload();
    if (!existingOpenRental || !payload) return;
    setIsSubmitting(true);
    try {
      await api.put(`/rentals/${existingOpenRental._id}/addItem`, { singleRents: payload.singleRents });
      setModalData({ 
          rentalId: existingOpenRental._id, 
          itemName: "New items", // Generic name
          quantity: selections.length // Can show how many new items were added
      });
      setShowSuccessModal(true);
      setSelections([]); // Reset the form
    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to add item.", 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container fluid>
      <h2 className="mb-4">Single Item Rent</h2>
      {loading ? ( <div className="text-center py-5"><Spinner /></div> ) : (
      <Row className="g-4">
        <Col lg={6} xl={7}>
          <Card>
            <Card.Header as="h5" className="d-flex align-items-center"><BoxSeam className="me-2" /> Selected Item</Card.Header>
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
                            <BsImage src={item.variation.imageUrl} thumbnail style={{ width: '80px', height: '80px', objectFit: 'cover', marginRight:'1rem' }} />
                          </Col>
                          <Col>
                            <p className="fw-bold mb-1">{item.product.name}</p>
                            <p className="text-muted small mb-0">Variation: {item.variation.color.name} - {item.variation.size}</p>
                            <p className="text-muted small mb-0">Qty: {item.quantity}</p>
                          </Col>
                          <Col xs="auto" className="text-end">
                            <p className="fw-bold h5 text-success mb-2">₱{(item.product.price * item.quantity).toLocaleString()}</p>
                            <>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleOpenEditor(item)}
                              >
                                <PencilSquare />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleRemoveItem(item.product._id, variationKey, item.product.name)}
                              >
                                <Trash />
                              </Button>
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
                  <Button variant="outline-primary" onClick={() => setShowItemModal(true)}>
                    Add More Items...
                  </Button>
                </>
              ) : (
                // --- Prompt to select the first item ---
                <div className="text-center my-auto">
                  <p className="text-muted fs-5">Your rental list is empty.</p>
                  <Button onClick={() => setShowItemModal(true)}>
                    Select an Item to Rent
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} xl={5}>
           <CustomerDetailsCard
            customerDetails={customerDetails}
            setCustomerDetails={setCustomerDetails}
            isNewCustomerMode={isNewCustomerMode}
            onSetIsNewCustomerMode={setIsNewCustomerMode}
            allRentals={allRentals}
            onSelectExisting={handleSelectCustomer}
            onSubmit={handleFormSubmission}
            isSubmitting={isSubmitting}
            canSubmit={selections.length > 0}
            existingOpenRental={existingOpenRental}
            selectedRentalForDisplay={selectedRentalForDisplay}
            errors={errors} 
          />
        </Col>
      </Row>
      )}

      <SingleItemSelectionModal
        show={showItemModal}
        onHide={() => { setShowItemModal(false); setItemToEdit(null); }}
        onSelect={itemToEdit ? handleItemUpdate : handleAddItem} // Conditional onSelect
        addAlert={addAlert}
        mode="rental"
        preselectedItemId={itemToEdit?.product._id}
        preselectedVariation={itemToEdit ? `${itemToEdit.variation.color.name}, ${itemToEdit.variation.size}` : undefined}
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

      <Modal show={showReminderModal} onHide={() => setShowReminderModal(false)} centered>
        <Modal.Header closeButton><Modal.Title><ExclamationTriangleFill className="me-2 text-warning" />Create New Rental?</Modal.Title></Modal.Header>
        <Modal.Body>This customer does not have a "Pending" rental. Do you want to create a completely new rental transaction for them?</Modal.Body>
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