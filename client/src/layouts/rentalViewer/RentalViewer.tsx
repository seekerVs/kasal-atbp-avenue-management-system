import React, { useState, useEffect, useMemo } from 'react';
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
  RentedItemBase,
  PackageRentItem,
  PackageFulfillment,
  CustomTailoringItem,
  RentalStatus,
  InventoryItem,
  PackageDetails,
} from '../../types';

const API_URL = 'http://localhost:3001/api';

// ===================================================================================
// --- HELPER FUNCTION ---
// ===================================================================================
const calculateSubtotal = (rental: RentalOrder | null): number => {
    if (!rental) return 0;
    const singleTotal = rental.singleRents?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
    const packageTotal = rental.packageRents?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
    const tailoringTotal = rental.customTailoring?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
    return singleTotal + packageTotal + tailoringTotal;
};

const calculateRequiredDeposit = (rental: RentalOrder | null): { min: number; message: string } => {
  if (!rental) return { min: 0, message: '' };

  // 1. Calculate deposit for single rents
  const singleRentsDeposit = rental.singleRents?.reduce((sum, item) => {
    const depositPerItem = item.price < 500 ? item.price : 500;
    return sum + (depositPerItem * item.quantity);
  }, 0) || 0;

  // 2. Calculate deposit for packages
  const packageDeposit = rental.packageRents?.reduce((sum, pkg) => {
    return sum + (2000 * pkg.quantity);
  }, 0) || 0;

  // 3. Calculate deposit for custom 'rent-back' items
  const customDeposit = rental.customTailoring?.reduce((sum, item) => {
    if (item.tailoringType === 'Tailored for Rent-Back') {
      return sum + (item.price * item.quantity);
    }
    return sum;
  }, 0) || 0;

  const totalMinDeposit = singleRentsDeposit + packageDeposit + customDeposit;

  let message = 'Deposit is calculated based on all items in the rental.';
  if (totalMinDeposit === 0) {
    message = 'No security deposit is required for this rental.';
  }

  return { min: totalMinDeposit, message };
};

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
  const [itemToModify, setItemToModify] = useState<RentedItemBase | null>(null);
  const [showDeletePackageModal, setShowDeletePackageModal] = useState(false);
  const [showEditPackageModal, setShowEditPackageModal] = useState(false);
  const [packageToModify, setPackageToModify] = useState<PackageRentItem | null>(null);
  const [showDeleteCustomItemModal, setShowDeleteCustomItemModal] = useState(false);
  const [showEditCustomItemModal, setShowEditCustomItemModal] = useState(false);
  const [customItemToModify, setCustomItemToModify] = useState<CustomTailoringItem | null>(null);

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [allPackages, setAllPackages] = useState<PackageDetails[]>([]);

  // --- DERIVED STATE & CALCULATIONS ---
  const subtotal = useMemo(() => calculateSubtotal(rental), [rental]);
  
  // --- DATA FETCHING & SYNCING ---
  useEffect(() => {
    if (!id) { addNotification("No rental ID provided.", 'danger'); setLoading(false); return; }
    const fetchRentalAndInventory = async () => {
      setLoading(true);
      try {
        const [rentalRes, inventoryRes, packagesRes] = await Promise.all([
          axios.get(`${API_URL}/rentals/${id}`),
          axios.get(`${API_URL}/inventory`),
          axios.get(`${API_URL}/packages`) // <-- Add this new API call
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
      setEditableCustomer(rental.customerInfo[0]);
      setEditableDiscount(String(rental.financials?.shopDiscount || '0'));
      setEditableStartDate(rental.rentalStartDate);
      setEditableEndDate(rental.rentalEndDate);
      setEditableDeposit(String(rental.financials?.depositAmount || '0')); // Initialize deposit

      const downPayment = rental.financials?.downPayment;
      if (downPayment?.referenceNumber) setPaymentUiMode('Gcash');

      const savedDeposit = rental.financials?.depositAmount || 0;
      const { min: defaultDeposit } = calculateRequiredDeposit(rental);
      const currentDeposit = savedDeposit > 0 ? savedDeposit : defaultDeposit;
      setEditableDeposit(String(currentDeposit)); // This line is correct

      // --- THIS IS THE SECTION TO FIX ---
      const subtotal = calculateSubtotal(rental);
      const discount = rental.financials?.shopDiscount || 0;
      const totalPaid = (rental.financials.downPayment?.amount || 0) + (rental.financials.finalPayment?.amount || 0);

      // The Grand Total includes the items AND the deposit
      const grandTotal = (subtotal - discount) + currentDeposit;
      
      const remainingBalance = grandTotal - totalPaid;

      // Set the paymentAmount to the full remaining balance
      setPaymentAmount(String(remainingBalance > 0 ? remainingBalance.toFixed(2) : '0.00'));
    }
  }, [rental]);

  const requiredDepositInfo = useMemo(() => {
    if (!rental) return { min: 0, max: null, message: '' };
    
    // The calculation for max is now only relevant for a very specific case
    const rentBackCustomItem = rental.customTailoring?.find(item => item.tailoringType === 'Tailored for Rent-Back');
    const isSingleRentBackOnly = rentBackCustomItem && rental.singleRents.length === 0 && rental.packageRents.length === 0 && rental.customTailoring.length === 1;

    const calculatedDeposit = calculateRequiredDeposit(rental);

    return {
      min: calculatedDeposit.min,
      // The 'max' rule only applies if the *only* item is a single rent-back custom piece.
      max: isSingleRentBackOnly ? calculatedDeposit.min : null,
      message: calculatedDeposit.message
    };
  }, [rental]);

  // --- EVENT HANDLERS ---
  const handleUpdateAndPay = async (payload: { status?: RentalStatus; rentalStartDate?: string; rentalEndDate?: string; shopDiscount?: number; depositAmount?: number; payment?: { amount: number; referenceNumber: string | null; } }) => {
    if (!rental) return;

    // --- NEW: Validate the deposit amount before sending ---
    const depositInput = parseFloat(editableDeposit) || 0;
    if (depositInput < requiredDepositInfo.min) {
      addNotification(`Deposit amount cannot be less than the required total of ₱${requiredDepositInfo.min.toFixed(2)}.`, 'danger');
      return;
    }
    if (requiredDepositInfo.max !== null && depositInput > requiredDepositInfo.max) {
      addNotification(`Deposit amount cannot be more than ₱${requiredDepositInfo.max.toFixed(2)}.`, 'danger');
      return;
    }
    
    // Add the validated deposit to the payload
    payload.depositAmount = depositInput;
    // ----------------------------------------------------

    try {
      const response = await axios.put(`${API_URL}/rentals/${rental._id}/process`, payload);
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
      const validationResponse = await axios.get(`${API_URL}/rentals/${rental._id}/pre-pickup-validation`);
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

    // 1. Calculate the full financial picture, including the deposit
    const discount = parseFloat(editableDiscount) || 0;
    const deposit = parseFloat(editableDeposit) || 0;
    const itemsTotal = subtotal - discount;
    const grandTotal = itemsTotal + deposit; // The true total amount owed

    const currentPaid = (rental.financials.downPayment?.amount || 0) + (rental.financials.finalPayment?.amount || 0);
    const finalPaymentInput = parseFloat(paymentAmount) || 0;

    // 2. Perform validation against the Grand Total
    // The total paid *after* this new payment must cover the grand total.
    if (currentPaid + finalPaymentInput < grandTotal) {
      const remainingNeeded = grandTotal - currentPaid;
      addNotification(`Payment is insufficient to mark as picked up. Remaining balance (incl. deposit) is ₱${remainingNeeded.toFixed(2)}.`, 'danger');
      return; // Stop the process
    }
    
    // Build the payload
    const payload: {
        status: RentalStatus;
        shopDiscount: number;
        depositAmount: number;
        payment?: { amount: number; referenceNumber: string | null; };
    } = {
        status: 'To Return', // The target status
        shopDiscount: discount,
        depositAmount: deposit
    };

    if (finalPaymentInput > 0) {
      payload.payment = {
        amount: finalPaymentInput,
        referenceNumber: paymentUiMode === 'Gcash' ? gcashRef : null
      };
    }

    handleUpdateAndPay(payload);
  };

  const handleSaveChanges = async () => {
    if (!editableCustomer || !id) return;
    try {
      const response = await axios.put(`${API_URL}/rentals/${id}/customer`, editableCustomer);
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

  const handleOpenDeleteItemModal = (item: RentedItemBase) => { setItemToModify(item); setShowDeleteItemModal(true); };
  const handleOpenEditItemModal = (item: RentedItemBase) => { setItemToModify(item); setShowEditItemModal(true); };
  const handleDeleteItem = async () => {
    if (!itemToModify || !rental) return;
    try {
        const response = await axios.delete(`${API_URL}/rentals/${rental._id}/items/${encodeURIComponent(itemToModify.name)}`);
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
        const response = await axios.put(`${API_URL}/rentals/${rental._id}/items/${encodeURIComponent(itemToModify.name)}`, payload);
        setRental(response.data);
        addNotification('Item updated successfully!', 'success');
    } catch (err: any) { 
      addNotification("Failed to update item.", 'danger'); 
    }
    finally { setShowEditItemModal(false); setItemToModify(null); }
  };

  const handleOpenEditPackageModal = (pkg: PackageRentItem) => { setPackageToModify(pkg); setShowEditPackageModal(true); };
  const handleOpenDeletePackageModal = (pkg: PackageRentItem) => { setPackageToModify(pkg); setShowDeletePackageModal(true); };
  const handleSavePackageChanges = async (pkgName: string, updatedFulfillment: PackageFulfillment[]) => {
    if (!rental) return;
    try {
      const response = await axios.put(`${API_URL}/rentals/${rental._id}/packages/${encodeURIComponent(pkgName)}`, { packageFulfillment: updatedFulfillment });
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
      const response = await axios.delete(`${API_URL}/rentals/${rental._id}/packages/${encodeURIComponent(packageToModify.name)}`);
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
        const response = await axios.put(`${API_URL}/rentals/${rental._id}/custom-items`, updatedItem);
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
        const response = await axios.delete(`${API_URL}/rentals/${rental._id}/custom-items/${encodeURIComponent(customItemToModify.name)}`);
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
            subtotal={subtotal}
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
            requiredDepositInfo={requiredDepositInfo} // Pass the calculated info object
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