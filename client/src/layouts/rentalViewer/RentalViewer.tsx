import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Breadcrumb,
  Modal,
  ListGroup,
} from 'react-bootstrap';
import axios from 'axios';
import { ExclamationTriangleFill } from 'react-bootstrap-icons';

// Import Child Components
import CustomerInfoCard from '../../components/customerInfoCard/CustomerInfoCard';
import RentalItemsList from '../../components/rentalItemsList/RentalItemsList';
import OrderActions from '../../components/orderActions/OrderActions';
import EditItemModal from '../../components/modals/editItemModal/EditItemModal';
import EditPackageModal from '../../components/modals/editPackageModal/EditPackageModal';
import EditCustomItemModal from '../../components/modals/editCustomItemModal/EditCustomItemModal'; // Import the new modal
import { useNotification } from '../../contexts/NotificationContext';

// Import Centralized Types
import {
  RentalOrder,
  CustomerInfo,
  SingleRentItem,
  RentedPackage,
  PackageFulfillment,
  CustomTailoringItem,
  RentalStatus,
  InventoryItem,
  Package
} from '../../types';
import api from '../../services/api';

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function RentalViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification(); 
  
  // --- STATE MANAGEMENT ---
  const [rental, setRental] = useState<RentalOrder | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // State for editing customer and order details
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableCustomer, setEditableCustomer] = useState<CustomerInfo | null>(null);
  const [editableDiscount, setEditableDiscount] = useState('0');
  const [editableStartDate, setEditableStartDate] = useState('');
  const [editableEndDate, setEditableEndDate] = useState('');
  
  // State for payment section
  const [paymentUiMode, setPaymentUiMode] = useState<'Cash' | 'Gcash'>('Cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [gcashRef, setGcashRef] = useState('');
  const [editableDeposit, setEditableDeposit] = useState('0');

  // State for modals and notifications
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [itemToModify, setItemToModify] = useState<SingleRentItem | null>(null);
  const [showDeletePackageModal, setShowDeletePackageModal] = useState(false);
  const [showEditPackageModal, setShowEditPackageModal] = useState(false);
  const [packageToModify, setPackageToModify] = useState<RentedPackage | null>(null);
  const [showDeleteCustomItemModal, setShowDeleteCustomItemModal] = useState(false);
  const [showEditCustomItemModal, setShowEditCustomItemModal] = useState(false);
  const [customItemToModify, setCustomItemToModify] = useState<CustomTailoringItem | null>(null);

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  
  // --- DATA FETCHING & SYNCING ---
  useEffect(() => {
    if (!id) { addNotification("No rental ID provided.", 'danger'); setLoading(false); return; }
    const fetchRentalAndInventory = async () => {
      setLoading(true);
      try {
        const [rentalRes, inventoryRes, packagesRes] = await Promise.all([
          api.get(`/rentals/${id}`),
          api.get('/inventory'),
          api.get('/packages')
        ]);
        setRental(rentalRes.data);
        setInventory(inventoryRes.data);
        setAllPackages(packagesRes.data);
      } catch (err) { 
        console.error("Error fetching data:", err); 
        addNotification("Failed to load rental details.", 'danger');
      } finally { setLoading(false); }
    };
    fetchRentalAndInventory();
  }, [id, addNotification]);

  useEffect(() => {
    if (rental) {
        // Sync local state directly from the server-provided rental object
        setEditableCustomer(rental.customerInfo[0]);
        setEditableDiscount(String(rental.financials?.shopDiscount || '0'));
        setEditableStartDate(rental.rentalStartDate);
        setEditableEndDate(rental.rentalEndDate);
        
        // The deposit amount is now directly from the server's calculation
        setEditableDeposit(String(rental.financials?.depositAmount || '0'));

        if (rental.financials?.downPayment?.referenceNumber) {
            setPaymentUiMode('Gcash');
        }

        setPaymentAmount('0');
    }
  }, [rental]); 

  // --- EVENT HANDLERS ---
  const handleUpdateAndPay = async (payload: { status?: RentalStatus; rentalStartDate?: string; rentalEndDate?: string; shopDiscount?: number; depositAmount?: number; payment?: { amount: number; referenceNumber: string | null; } }) => {
    if (!rental) return;

    // --- NEW: Validate the deposit amount before sending ---
    const depositInput = parseFloat(editableDeposit) || 0;
    const requiredMinDeposit = rental.financials.requiredDeposit || 0; 
    if (depositInput < requiredMinDeposit) {
      addNotification(`Deposit amount cannot be less than the required total of ₱${requiredMinDeposit.toFixed(2)}.`, 'danger');
      return;
    }
    
    // Add the validated deposit to the payload
    payload.depositAmount = depositInput;
    // ----------------------------------------------------

    try {
      const response = await api.put(`/rentals/${rental._id}/process`, payload);
      setRental(response.data);
      addNotification('Order updated successfully!', 'success');
    } catch (err: any) { 
      addNotification(err.response?.data?.message || "Failed to update details.", 'danger');
    }
  };

  // --- NEW: Validation and Pickup Flow ---
  const initiateMoveToPickup = async () => {
    if (!rental) return;

    try {
      // 1. Call the new validation endpoint
      const validationResponse = await api.get(`/rentals/${rental._id}/pre-pickup-validation`);
      const warnings = validationResponse.data.warnings;

      // 2. Check if there are any warnings
      if (warnings && warnings.length > 0) {
        // If there are warnings, show the modal and stop
        setValidationWarnings(warnings);
        setShowValidationModal(true);
      } else {
        // 3. If validation passes, proceed with the original logic
        const amountToPay = parseFloat(paymentAmount) || 0;
        const discountAmount = parseFloat(editableDiscount) || 0;
        const isPaid = (rental.financials.downPayment?.amount || 0) > 0;

        const payload: Parameters<typeof handleUpdateAndPay>[0] = {
            status: 'To Pickup',
            rentalStartDate: editableStartDate,
            rentalEndDate: editableEndDate,
            shopDiscount: discountAmount,
        };
        
        // Only include payment details if this is the first payment
        if (!isPaid && amountToPay > 0) {
            payload.payment = {
                amount: amountToPay,
                referenceNumber: paymentUiMode === 'Gcash' ? gcashRef : null,
            };
        }
        
        // Call the central update function
        handleUpdateAndPay(payload);
      }
    } catch (err: any) {
      addNotification(err.response?.data?.message || 'Pre-pickup check failed.', 'danger');
    }
  };


  // --- NEW HANDLER FOR THE COMBINED ACTION ---
  const handleMarkAsPickedUp = () => {
    if (!rental) return;

    // 1. Get all financial data directly from the server-provided rental object
    const grandTotal = rental.financials.grandTotal || 0;
    const totalPaid = rental.financials.totalPaid || 0;
    const finalPaymentInput = parseFloat(paymentAmount) || 0;

    // 2. Validate if the new payment covers the remaining balance
    // The total paid SO FAR plus the payment being made now must be >= the grand total.
    if ((totalPaid + finalPaymentInput) < grandTotal) {
        const remainingNeeded = grandTotal - totalPaid;
        addNotification(`Payment is insufficient. Remaining balance of ₱${remainingNeeded.toFixed(2)} is required.`, 'danger');
        return; // Stop the process
    }
    
    // 3. Build the payload for the update
    const payload: Parameters<typeof handleUpdateAndPay>[0] = {
        status: 'To Return', // The target status
        // We also send the current discount/deposit values in case they were edited
        shopDiscount: parseFloat(editableDiscount) || 0,
        depositAmount: parseFloat(editableDeposit) || 0,
    };

    // If a final payment amount was entered, include it in the payload.
    if (finalPaymentInput > 0) {
      payload.payment = {
        amount: finalPaymentInput,
        referenceNumber: paymentUiMode === 'Gcash' ? gcashRef : null
      };
    }

    // 4. Call the central update function
    handleUpdateAndPay(payload);
  };

  const handleSaveChanges = async () => {
    if (!editableCustomer || !id) return;
    try {
      const response = await api.put(`/rentals/${id}/customer`, editableCustomer);
      setRental(response.data);
      setIsEditMode(false);
      addNotification('Customer details updated successfully!', 'success');
    } catch (err) { 
      addNotification("Failed to save customer details.", 'danger'); 
    }
  };

  const handleCancelEdit = () => {
    if (rental) setEditableCustomer(rental.customerInfo[0]);
    setIsEditMode(false);
  };
  
  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (editableCustomer) setEditableCustomer({ ...editableCustomer, [e.target.name]: e.target.value });
  };

  const handleOpenDeleteItemModal = (item: SingleRentItem) => { setItemToModify(item); setShowDeleteItemModal(true); };
  const handleOpenEditItemModal = (item: SingleRentItem) => { setItemToModify(item); setShowEditItemModal(true); };
  const handleDeleteItem = async () => {
    if (!itemToModify || !rental) return;
    try {
        const response = await api.delete(`/rentals/${rental._id}/items/${encodeURIComponent(itemToModify.name)}`);
        setRental(response.data);
        addNotification('Item removed successfully!', 'success');
    } catch (err: any) { 
      addNotification("Failed to remove item.", 'danger'); 
    }
    finally { setShowDeleteItemModal(false); setItemToModify(null); }
  };

  const handleSaveItemChanges = async (newQuantity: number, newVariationJSON: string) => {
    if (!itemToModify || !rental) return;

    const newVariation = JSON.parse(newVariationJSON); 
    const payload = { 
        quantity: newQuantity, 
        newVariation: { color: newVariation.color, size: newVariation.size }};
    try {
        const response = await api.put(`/rentals/${rental._id}/items/${encodeURIComponent(itemToModify.name)}`, payload);
        setRental(response.data);
        addNotification('Item updated successfully!', 'success');
    } catch (err: any) { 
      addNotification("Failed to update item.", 'danger'); 
    }
    finally { setShowEditItemModal(false); setItemToModify(null); }
  };

  const handleOpenEditPackageModal = (pkg: RentedPackage) => { setPackageToModify(pkg); setShowEditPackageModal(true); };
  const handleOpenDeletePackageModal = (pkg: RentedPackage) => { setPackageToModify(pkg); setShowDeletePackageModal(true); };
  const handleSavePackageChanges = async (pkgName: string, updatedFulfillment: PackageFulfillment[]) => {
    if (!rental) return;
    try {
      const response = await api.put(`/rentals/${rental._id}/packages/${encodeURIComponent(pkgName)}`, { packageFulfillment: updatedFulfillment });
      setRental(response.data);
      addNotification('Package details updated successfully!', 'success');
    } catch (err: any) { 
      addNotification("Failed to update package details.", 'danger'); 
    }
    finally { setShowEditPackageModal(false); setPackageToModify(null); }
  };
  const handleDeletePackage = async () => {
    if (!packageToModify || !rental) return;
    try {
      const response = await api.delete(`/rentals/${rental._id}/packages/${encodeURIComponent(packageToModify.name)}`);
      setRental(response.data);
      addNotification('Package removed successfully!', 'success');
    } catch (err: any) {  
      addNotification("Failed to remove package.", 'danger'); 
    }
    finally { setShowDeletePackageModal(false); setPackageToModify(null); }
  };

  const handleOpenEditCustomItemModal = (item: CustomTailoringItem) => { setCustomItemToModify(item); setShowEditCustomItemModal(true); };
  const handleOpenDeleteCustomItemModal = (item: CustomTailoringItem) => { setCustomItemToModify(item); setShowDeleteCustomItemModal(true); };
  const handleSaveCustomItemChanges = async (updatedItem: CustomTailoringItem) => {
    if (!rental) return;
    try {
        const response = await api.put(`/rentals/${rental._id}/custom-items`, updatedItem);
        setRental(response.data);
        addNotification('Custom item updated successfully!', 'success');
    } catch (err: any) { 
      addNotification("Failed to update custom item.", 'danger');
    }
    finally { setShowEditCustomItemModal(false); setCustomItemToModify(null); }
  };
  const handleDeleteCustomItem = async () => {
    if (!customItemToModify || !rental) return;
    try {
        const response = await api.delete(`/rentals/${rental._id}/custom-items/${encodeURIComponent(customItemToModify.name)}`);
        setRental(response.data);
        addNotification('Custom item removed successfully!', 'success');
    } catch (err: any) { 
      addNotification("Failed to remove custom item.", 'danger');
    }
    finally { setShowDeleteCustomItemModal(false); setCustomItemToModify(null); }
  };

  if (loading) { return <Container className="text-center py-5"><Spinner /></Container>; }
  if (!rental || !editableCustomer) { return <Container><Alert variant="info">Rental order data could not be displayed.</Alert></Container>; }
  
  const canEditDetails = rental.status === 'To Process';

  return (
    <Container fluid>
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
              <CustomerInfoCard
                customer={editableCustomer}
                isEditMode={isEditMode}
                canEdit={rental.status === 'To Process'}
                onSetIsEditMode={setIsEditMode}
                onCustomerInputChange={handleCustomerInputChange}
                onSaveChanges={handleSaveChanges}
                onCancelEdit={handleCancelEdit}
              />
              <RentalItemsList
                singleRents={rental.singleRents}
                packageRents={rental.packageRents}
                customTailoring={rental.customTailoring}
                canEditDetails={canEditDetails}
                onOpenEditItemModal={handleOpenEditItemModal}
                onOpenDeleteItemModal={handleOpenDeleteItemModal}
                onOpenEditPackageModal={handleOpenEditPackageModal}
                onOpenDeletePackageModal={handleOpenDeletePackageModal}
                onOpenEditCustomItemModal={handleOpenEditCustomItemModal}
                onOpenDeleteCustomItemModal={handleOpenDeleteCustomItemModal}
              />
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <OrderActions
            onInitiateMoveToPickup={initiateMoveToPickup}
            rental={rental}
            status={rental.status}
            financials={rental.financials}
            subtotal={rental.financials.subtotal || 0}
            editableDiscount={editableDiscount}
            onDiscountChange={setEditableDiscount}
            editableStartDate={editableStartDate}
            onStartDateChange={setEditableStartDate}
            editableEndDate={editableEndDate}
            onEndDateChange={setEditableEndDate}
            canEditDetails={canEditDetails}
            paymentUiMode={paymentUiMode}
            onPaymentUiModeChange={setPaymentUiMode}
            paymentAmount={paymentAmount}
            onPaymentAmountChange={setPaymentAmount}
            gcashRef={gcashRef}
            onGcashRefChange={setGcashRef}
            onUpdateAndPay={handleUpdateAndPay}
            onMarkAsPickedUp={handleMarkAsPickedUp}
            editableDeposit={editableDeposit}
            onDepositChange={setEditableDeposit}
            requiredDepositInfo={{
                min: rental.financials.requiredDeposit || 0,
                max: null,
                message: 'Deposit details are based on the items in the rental.'
            }} // Pass the calculated info object
          />
        </Col>
      </Row>

      <Modal show={showDeleteItemModal} onHide={() => setShowDeleteItemModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to remove <strong>{itemToModify?.name.split(',')[0]}</strong> from this rental? This will return its stock to inventory.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteItemModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteItem}>Delete Item</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeletePackageModal} onHide={() => setShowDeletePackageModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Package Deletion</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to remove the package: <strong>{packageToModify?.name.split(',')[0]}</strong> from this rental? This will return all its items to stock.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeletePackageModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeletePackage}>Delete Package</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDeleteCustomItemModal} onHide={() => setShowDeleteCustomItemModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to remove the custom item: <strong>{customItemToModify?.name}</strong>?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteCustomItemModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteCustomItem}>Delete Item</Button>
        </Modal.Footer>
      </Modal>

      {/* --- ADD THE NEW VALIDATION MODAL --- */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <ExclamationTriangleFill className="me-2 text-warning" />
            Action Required
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>This rental cannot be moved to "To Pickup" yet. Please resolve the following issues:</p>
          <ListGroup variant="flush">
            {validationWarnings.map((warning, index) => (
              <ListGroup.Item key={index} className="text-danger border-0 ps-0">
                - {warning}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowValidationModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {showEditItemModal && itemToModify && (
        <EditItemModal 
          show={showEditItemModal} 
          onHide={() => setShowEditItemModal(false)}
          item={itemToModify}
          onSave={handleSaveItemChanges}
        />
      )}
      
      {showEditPackageModal && packageToModify && (
        <EditPackageModal
          show={showEditPackageModal}
          onHide={() => setShowEditPackageModal(false)}
          pkg={packageToModify}
          inventory={inventory}
          onSave={handleSavePackageChanges}
          allPackages={allPackages}
          customItems={rental.customTailoring || []} 
        />
      )}

      {showEditCustomItemModal && customItemToModify && (
        <EditCustomItemModal
          show={showEditCustomItemModal}
          onHide={() => setShowEditCustomItemModal(false)}
          item={customItemToModify}
          onSave={handleSaveCustomItemChanges}
        />
      )}
    </Container>
  );
}

export default RentalViewer;