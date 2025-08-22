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

import { EnvelopeFill, ExclamationTriangleFill, GeoAltFill, PencilSquare, PersonFill, TelephoneFill } from 'react-bootstrap-icons';

// Import Child Components
import RentalItemsList from '../../components/rentalItemsList/RentalItemsList';
import OrderActions from '../../components/orderActions/OrderActions';
import EditPackageModal from '../../components/modals/editPackageModal/EditPackageModal';
import { useAlert } from '../../contexts/AlertContext';

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
  Package,
  ItemVariation
} from '../../types';
import api, { uploadFile } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import AddItemFromCustomModal from '../../components/modals/addItemFromCustomModal/AddItemFromCustomModal';
import CreateEditCustomItemModal from '../../components/modals/createEditCustomItemModal/CreateEditCustomItemModal';
import { EditCustomerInfoModal } from '../../components/modals/editCustomerInfoModal/EditCustomerInfoModal';
import { SelectedItemData, SingleItemSelectionModal } from '../../components/modals/singleItemSelectionModal/SingleItemSelectionModal';
import { addDays, format } from 'date-fns';

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function RentalViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addAlert } = useAlert();
  
  // --- STATE MANAGEMENT ---
  const [rental, setRental] = useState<RentalOrder | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // State for editing customer and order details
  const [editableDiscount, setEditableDiscount] = useState('0');
  const [editableStartDate, setEditableStartDate] = useState('');
  const [editableEndDate, setEditableEndDate] = useState('');
  const [rentBackQueue, setRentBackQueue] = useState<CustomTailoringItem[]>([]);
  
  // State for payment section
  const [paymentUiMode, setPaymentUiMode] = useState<'Cash' | 'Gcash'>('Cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [gcashRef, setGcashRef] = useState('');
  const [editableDeposit, setEditableDeposit] = useState('0');
  const [reimburseAmount, setReimburseAmount] = useState('0');
  const [showReturnConfirmModal, setShowReturnConfirmModal] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // State for modals
  const [showDeleteItemModal, setShowDeleteItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [itemToModify, setItemToModify] = useState<SingleRentItem | null>(null);
  const [showDeletePackageModal, setShowDeletePackageModal] = useState(false);
  const [showEditPackageModal, setShowEditPackageModal] = useState(false);
  const [packageToModify, setPackageToModify] = useState<RentedPackage | null>(null);
  const [showDeleteCustomItemModal, setShowDeleteCustomItemModal] = useState(false);
  const [showEditCustomItemModal, setShowEditCustomItemModal] = useState(false);
  const [customItemToModify, setCustomItemToModify] = useState<CustomTailoringItem | null>(null);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [packageHasCustomItems, setPackageHasCustomItems] = useState(false);
  const [canProceedWithWarnings, setCanProceedWithWarnings] = useState(false);
  const [showPickupConfirmModal, setShowPickupConfirmModal] = useState(false);
  const [showMarkAsPickedUpConfirmModal, setShowMarkAsPickedUpConfirmModal] = useState(false);
  const [showRentBackModal, setShowRentBackModal] = useState(false);
  const [itemToRentBack, setItemToRentBack] = useState<CustomTailoringItem | null>(null);
  const [isEditingItemForPackage, setIsEditingItemForPackage] = useState(false);

  // --- DATA FETCHING & SYNCING ---
  useEffect(() => {
    if (!id) { addAlert("No rental ID provided.", 'danger'); setLoading(false); return; }
    const fetchRentalAndInventory = async () => {
      setLoading(true);
      try {
        const [rentalRes, inventoryRes, packagesRes] = await Promise.all([
          api.get(`/rentals/${id}`),
          api.get('/inventory'),
          api.get('/packages')
        ]);
        setRental(rentalRes.data);
        setInventory(inventoryRes.data.items || []);
        setAllPackages(packagesRes.data);
      } catch (err) { 
        console.error("Error fetching data:", err); 
        addAlert("Failed to load rental details.", 'danger');
      } finally { setLoading(false); }
    };
    fetchRentalAndInventory();
  }, [id, addAlert]);

  useEffect(() => {
    if (rental) {
        // Sync local state directly from the server-provided rental object
        setEditableDiscount(String(rental.financials?.shopDiscount || '0'));
        setEditableStartDate(rental.rentalStartDate);
        setEditableEndDate(rental.rentalEndDate);
        
        // The deposit amount is now directly from the server's calculation
        setEditableDeposit(String(rental.financials?.depositAmount || '0'));

        if (rental.financials?.payments?.[0]?.referenceNumber) {
          setPaymentUiMode('Gcash');
      }

        setPaymentAmount('0');
    }
  }, [rental]); 

  useEffect(() => {
  // Only calculate if there's a valid start date
  if (editableStartDate) {
    try {
      const startDateObj = new Date(editableStartDate);
      // Add 3 days to get a 4-day inclusive period (e.g., 4th to 7th is +3 days)
      const endDateObj = addDays(startDateObj, 3);
      const formattedEndDate = format(endDateObj, 'yyyy-MM-dd');
      setEditableEndDate(formattedEndDate);
    } catch (e) {
      console.error("Invalid start date provided", e);
      setEditableEndDate(''); // Clear end date if start date is invalid
    }
  } else {
    setEditableEndDate(''); // Clear end date if start date is cleared
  }
}, [editableStartDate]); 

  // --- EVENT HANDLERS ---
  const handleInitiatePickup = () => {
    // You can perform any pre-modal checks here if needed in the future
    setShowPickupConfirmModal(true);
  };

  const handleInitiateMarkAsPickedUp = () => {
    // This will trigger the confirmation before calling the main logic
    setShowMarkAsPickedUpConfirmModal(true);
  };

  const handleConfirmReturn = async () => {
    setShowReturnConfirmModal(false);
    if (!rental) return;
    
    try {
      const response = await api.put(`/rentals/${rental?._id}/process`, {
          status: 'Returned',
          depositReimbursed: parseFloat(reimburseAmount) || 0,
      });
      
      setRental(response.data);
      addAlert('Rental successfully marked as returned!', 'success');
      
      // Since the process is complete, ensure the queue is empty.
      setRentBackQueue([]);

    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to mark as returned.", 'danger');
    }
  };

  const handleUpdateItemFromSelection = async (selection: SelectedItemData) => {
    if (!itemToModify || !rental) {
      addAlert("Could not update item: context is missing.", "danger");
      return;
    }

    const { variation: newVariation, quantity: newQuantity } = selection;

    const payload = { 
      quantity: newQuantity, 
      newVariation: newVariation // The backend expects a 'newVariation' object
    };
    
    try {
      const response = await api.put(`/rentals/${rental._id}/items/${itemToModify._id}`, payload);
      setRental(response.data);
      addAlert('Item updated successfully!', 'success');
    } catch (err: any) { 
      addAlert(err.response?.data?.message || "Failed to update item.", 'danger'); 
    }
    finally { 
      // Close the modal and reset the state
      setShowEditItemModal(false); 
      setItemToModify(null); 
    }
  };

  const processNextInQueue = (queue: CustomTailoringItem[]) => {
    if (queue.length > 0) {
      // If there are items left, open the modal for the next one.
      setItemToRentBack(queue[0]);
      setShowRentBackModal(true);
    } else {
      // If the queue is empty, all items are processed.
      // Now it's safe to show the final confirmation modal.
      setShowReturnConfirmModal(true);
    }
  };

  const handleUpdateAndPay = async (payload: { status?: RentalStatus; rentalStartDate?: string; rentalEndDate?: string; shopDiscount?: number; depositAmount?: number; depositReimbursed?: number; payment?: { amount: number; referenceNumber: string | null; receiptImageUrl?: string; } }) => {
    if (!rental) return;

    try {
      // If a payment is being made via GCash and a receipt file exists, upload it.
      if (payload.payment && paymentUiMode === 'Gcash' && receiptFile) {
        addAlert('Uploading receipt...', 'info');
        const uploadedUrl = await uploadFile(receiptFile);
        payload.payment.receiptImageUrl = uploadedUrl;
      }
      
      const depositInput = parseFloat(editableDeposit) || 0;
      const requiredMinDeposit = rental.financials.requiredDeposit || 0; 
      if (depositInput < requiredMinDeposit) {
        addAlert(`Deposit amount cannot be less than the required total of ₱${requiredMinDeposit.toFixed(2)}.`, 'danger');
        return;
      }
      payload.depositAmount = depositInput;
    
      const response = await api.put(`/rentals/${rental._id}/process`, payload);
      setRental(response.data);
      addAlert('Rental updated successfully!', 'success');
      
    } catch (err: any) { 
      addAlert(err.response?.data?.message || "Failed to update details.", 'danger');
    } finally {
      // Clear the staged file after any submission attempt
      setReceiptFile(null);
    }
  };

  const handleConfirmPickup = async () => {
    setShowPickupConfirmModal(false);
    if (!rental) return;

    try {
      const validationResponse = await api.get(`/rentals/${rental._id}/pre-pickup-validation`);
      const warnings: string[] = validationResponse.data.warnings || [];
      
      let isAnyRoleComplete = false;
      if (rental.packageRents && rental.packageRents.length > 0) {
        isAnyRoleComplete = rental.packageRents.some(pkg => 
          pkg.packageFulfillment.some(fulfill => {
            const assigned = fulfill.assignedItem;
            const isInventoryComplete = !fulfill.isCustom && assigned && 'itemId' in assigned && assigned.itemId && assigned.variation;
            const isCustomComplete = fulfill.isCustom && assigned && 'outfitCategory' in assigned;
            return isInventoryComplete || isCustomComplete;
          })
        );
      }
      
      setValidationWarnings(warnings);
      setCanProceedWithWarnings(isAnyRoleComplete);
      
      if (warnings.length > 0) {
        setShowValidationModal(true);
      } else {
        await proceedToUpdateStatus(); // Await this call now
      }

    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Pre-pickup check failed.', 'danger');
    }
  };

  const proceedToUpdateStatus = async () => { // Make this async
    if (!rental) return;
    setShowValidationModal(false);

    const amountToPay = parseFloat(paymentAmount) || 0;
    const discountAmount = parseFloat(editableDiscount) || 0;
    const isPaid = (rental.financials.totalPaid || 0) > 0;

    const payload: Parameters<typeof handleUpdateAndPay>[0] = {
        status: 'To Pickup',
        rentalStartDate: editableStartDate,
        rentalEndDate: editableEndDate,
        shopDiscount: discountAmount,
    };
    
    if (!isPaid && amountToPay > 0) {
        payload.payment = {
            amount: amountToPay,
            referenceNumber: paymentUiMode === 'Gcash' ? gcashRef : null,
        };
    }
    
    await handleUpdateAndPay(payload); // Await this call now
  };


  const handleConfirmMarkAsPickedUp = async () => { // Make this async
    setShowMarkAsPickedUpConfirmModal(false);
    if (!rental) return;

    const finalPaymentInput = parseFloat(paymentAmount) || 0;
    const payload: Parameters<typeof handleUpdateAndPay>[0] = {
        status: 'To Return',
        shopDiscount: parseFloat(editableDiscount) || 0,
        depositAmount: parseFloat(editableDeposit) || 0,
    };

    if (finalPaymentInput > 0) {
      payload.payment = {
        amount: finalPaymentInput,
        referenceNumber: paymentUiMode === 'Gcash' ? gcashRef : null
      };
    }

    await handleUpdateAndPay(payload); // Await this call now
  };

  const handleOpenDeleteItemModal = (item: SingleRentItem) => { setItemToModify(item); setShowDeleteItemModal(true); };
  const handleOpenEditItemModal = (item: SingleRentItem) => { setItemToModify(item); setShowEditItemModal(true); };

  const handleDeleteEntireRental = async (rentalId: string) => {
    addAlert("This rental is now empty and will be deleted.", 'info');
    try {
      // Use the existing DELETE /api/rentals/:id endpoint
      await api.delete(`/rentals/${rentalId}`);
      // Redirect after a short delay to allow the user to see the notification
      setTimeout(() => {
        navigate('/manageRentals');
      }, 2000);
    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to delete the empty rental.", 'danger');
    }
  };

  const checkAndCleanupIfEmpty = (updatedRental: RentalOrder) => {
    const isEmpty = 
      (!updatedRental.singleRents || updatedRental.singleRents.length === 0) &&
      (!updatedRental.packageRents || updatedRental.packageRents.length === 0) &&
      (!updatedRental.customTailoring || updatedRental.customTailoring.length === 0);

    if (isEmpty) {
      handleDeleteEntireRental(updatedRental._id);
      return true; // Return true to signal that cleanup has started
    }
    return false; // No cleanup needed
  };

  const handleDeleteItem = async () => {
    if (!itemToModify || !rental) return;
    try {
        const response = await api.delete(`/rentals/${rental._id}/items/${itemToModify._id}`);
    
        // Check if the rental is now empty. If so, stop further processing.
        const wasCleanedUp = checkAndCleanupIfEmpty(response.data);
        if (wasCleanedUp) return;

        // If not cleaned up, update the state as usual.
        setRental(response.data);
        addAlert('Item removed successfully!', 'success');
    } catch (err: any) { 
      addAlert("Failed to remove item.", 'danger'); 
    }
    finally { setShowDeleteItemModal(false); setItemToModify(null); }
  };

  const handleOpenEditPackageModal = (pkg: RentedPackage) => { setPackageToModify(pkg); setShowEditPackageModal(true); };
  const handleOpenDeletePackageModal = (pkg: RentedPackage) => {
    // 1. Determine if the package contains any roles that are custom.
    const hasCustom = pkg.packageFulfillment.some(
      (fulfill) => fulfill.isCustom === true
    );
    
    // 2. Set both state variables needed for the modal.
    setPackageToModify(pkg);
    setPackageHasCustomItems(hasCustom);
    setShowDeletePackageModal(true);
  };
  
  const handleSavePackageChanges = async (
    updatedFulfillment: PackageFulfillment[], 
    updatedCustomItems: CustomTailoringItem[],
    customItemIdsToDelete: string[], // <-- Receive the new list
    imageUrlsToDelete: string[]
  ) => {
      if (!rental || !packageToModify) {
          addAlert("Cannot save package, rental data is missing.", "danger");
          return;
      }

      try {
          // We will call a new, more powerful backend endpoint
          const response = await api.put(
              `/rentals/${rental._id}/packages/${packageToModify._id}/consolidated-update`, 
              {
                  packageFulfillment: updatedFulfillment,
                  customItems: updatedCustomItems,
                  customItemIdsToDelete: customItemIdsToDelete, // <-- Send the list to the backend
                  imageUrlsToDelete: imageUrlsToDelete,
              }
          );

          setRental(response.data);
          addAlert('Package details updated successfully!', 'success');
          
      } catch (err: any) { 
          const errorMessage = err.response?.data?.message || "Failed to update package details.";
          addAlert(errorMessage, 'danger'); 
      } finally { 
          setShowEditPackageModal(false); 
          setPackageToModify(null); 
      }
  };
  
  const handleDeletePackage = async () => {
    if (!packageToModify || !rental) return;
    try {
      const response = await api.delete(`/rentals/${rental._id}/packages/${packageToModify._id}`);
    
      const wasCleanedUp = checkAndCleanupIfEmpty(response.data);
      if (wasCleanedUp) return;
      
      setRental(response.data);
      addAlert('Package removed successfully!', 'success');
    } catch (err: any) {  
      addAlert("Failed to remove package.", 'danger'); 
    }
    finally { setShowDeletePackageModal(false); setPackageToModify(null); }
  };

  const handleOpenEditCustomItemModal = (itemToEdit: CustomTailoringItem) => {
    if (!rental) return;

    // --- NEW LOGIC: Check if this item is part of any package ---
    const isFromPackage = rental.packageRents.some(pkg => 
        pkg.packageFulfillment.some(fulfill => {
            // If it's not a custom slot, it can't match.
            if (!fulfill.isCustom) return false;

            const assigned = fulfill.assignedItem;

            // --- THIS IS THE TYPE GUARD ---
            // Check that 'assigned' exists and has the 'itemId' property before using it.
            if (assigned && 'itemId' in assigned) {
                return assigned.itemId === itemToEdit._id;
            }

            return false;
        })
    );

    // Set both state variables needed for the modal
    setCustomItemToModify(itemToEdit);
    setIsEditingItemForPackage(isFromPackage); // Set our new context flag
    setShowEditCustomItemModal(true);
  };
  const handleOpenDeleteCustomItemModal = (item: CustomTailoringItem) => { 
    setCustomItemToModify(item); 
    setShowDeleteCustomItemModal(true); 
  };

  const handleDeleteCustomItem = async () => {
    if (!customItemToModify || !rental) return;

    const itemIdToDelete = customItemToModify._id;
    let packageContext = null;

    // --- Step 1: Search for the item's ID within package fulfillments ---
    for (const pkg of rental.packageRents) {
        const targetFulfillment = pkg.packageFulfillment.find((fulfill) => {
            if (!fulfill.isCustom) return false;
            const assigned = fulfill.assignedItem;
            if (assigned && 'itemId' in assigned) {
                return assigned.itemId === itemIdToDelete;
            }
            return false;
        });

        if (targetFulfillment) {
            packageContext = {
                packageId: pkg._id,
                role: targetFulfillment.role,
            };
            break;
        }
    }

    try {
        let response;
        // --- Step 2: Call the appropriate permanent deletion route ---
        if (packageContext) {
            // Use the route that clears assignment AND deletes the item
            addAlert(`Deleting item and clearing assignment for role: ${packageContext.role}...`, 'info');
            response = await api.delete(
                `/rentals/${rental._id}/packages/${packageContext.packageId}/custom-items/${itemIdToDelete}`
            );
        } else {
            // Use the route that just deletes a standalone custom item
            response = await api.delete(
                `/rentals/${rental._id}/custom-items/${itemIdToDelete}`
            );
        }

        // --- Step 3: Process the response ---
        const wasCleanedUp = checkAndCleanupIfEmpty(response.data);
        if (wasCleanedUp) return;

        setRental(response.data);
        addAlert('Custom item removed successfully!', 'success');

    } catch (err: any) {
        addAlert(err.response?.data?.message || "Failed to remove custom item.", 'danger');
    } finally {
        // --- Step 4: Close the modal ---
        setShowDeleteCustomItemModal(false);
        setCustomItemToModify(null);
    }
  };
  const handleSaveCustomItemChanges = async (updatedItem: CustomTailoringItem) => {
    if (!rental) return;
    try {
        const response = await api.put(`/rentals/${rental._id}/custom-items/${updatedItem._id}`, updatedItem);
        setRental(response.data);
        addAlert('Custom item updated successfully!', 'success');
    } catch (err: any) { 
        addAlert("Failed to update custom item.", 'danger');
    }
    finally { 
        setShowEditCustomItemModal(false); 
        setCustomItemToModify(null); 
    }
};

  const handleDiscountChange = (value: string) => {
    // 1. Safely get the maximum possible discount (the total value of all items).
    // The `itemsTotal` is calculated by the backend and is the perfect value for this.
    const subtotal = rental?.financials?.itemsTotal ?? 0;
    const deposit = parseFloat(editableDeposit) || 0; // Use the current deposit from state
    const maxDiscount = subtotal + deposit;

    // 2. If we don't have a max value to compare against, just update the input.
    if (maxDiscount === undefined || maxDiscount === null) {
      setEditableDiscount(value);
      return;
    }

    // 3. Parse the user's input into a number.
    const newDiscountValue = parseFloat(value) || 0;

    // 4. THE VALIDATION: Check if the entered discount exceeds the maximum.
    if (newDiscountValue > maxDiscount) {
      // If it does, show a notification and reset the input to the max value.
      addAlert(
        `Discount cannot exceed the rental total of ₱${maxDiscount.toFixed(2)}.`,
        'danger'
      );
      setEditableDiscount(String(maxDiscount));
    } else {
      // If the value is valid, update the state with the user's input.
      setEditableDiscount(value);
    }
  };

  const handleDepositChange = (value: string) => {
    // 1. Get the validation boundaries from the rental's financial data.
    const subtotal = rental?.financials?.itemsTotal;

    // 2. If we can't get the subtotal yet, just update the state directly.
    if (subtotal === undefined || subtotal === null) {
      setEditableDeposit(value);
      return;
    }

    // 3. Parse the user's input. Default to 0 if it's not a valid number.
    const newDepositValue = parseFloat(value) || 0;

    // 4. --- APPLY THE VALIDATION RULES ---

    // Rule A: If the entered deposit is greater than the subtotal...
    if (newDepositValue > subtotal) {
      // ...notify the user and cap the value at the subtotal.
      addAlert(
        `Deposit cannot exceed the item subtotal of ₱${subtotal.toFixed(2)}.`,
        'danger'
      );
      setEditableDeposit(String(subtotal));
      return; // Stop further processing
    }

    // Rule B: If the entered deposit is less than zero...
    if (newDepositValue < 0) {
      // ...reset the value to "0".
      setEditableDeposit('0');
      return; // Stop further processing
    }
    
    // 5. If all validations pass, update the state with the user's input.
    setEditableDeposit(value);
  };

  const handleDepositBlur = () => {
    if (editableDeposit.trim() === '') {
      setEditableDeposit('0');
    }
  };

  const handleDiscountBlur = () => {
    // If the discount input is empty when the user clicks away,
    // set it to "0" to prevent calculation errors.
    if (editableDiscount.trim() === '') {
      setEditableDiscount('0');
    }
  };

  const handlePaymentAmountBlur = () => {
    // If the payment amount input is empty when the user clicks away,
    // set it back to "0" to prevent validation issues.
    if (paymentAmount.trim() === '') {
      setPaymentAmount('0');
    }
  };

  const handleReimburseDeposit = async (amount: number) => {
    if (!rental) return;

    try {
      const response = await api.put(`/rentals/${rental._id}/reimburse`, { amount });
      setRental(response.data); // Update the state with the final, "Completed" rental object
      addAlert('Order completed and deposit reimbursement recorded!', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to process reimbursement.", 'danger');
    }
  };

  const handleReimburseAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    const deposit = rental?.financials.depositAmount || 0;

    if (isNaN(numValue) || numValue < 0) {
      setReimburseAmount('0');
    } else if (numValue > deposit) {
      setReimburseAmount(String(deposit));
    } else {
      setReimburseAmount(value);
    }
  };

  const handleInitiateReturn = (customItems: CustomTailoringItem[]) => {
    // 1. Find all items that need to be processed.
    const itemsToProcess = customItems.filter(
      (item) => item.tailoringType === 'Tailored for Rent-Back'
    );
    
    // 2. Populate our new client-side queue.
    setRentBackQueue(itemsToProcess);

    // 3. Start the processing flow with our new helper function.
    processNextInQueue(itemsToProcess);
  };

  const handleCustomerSave = async (updatedCustomer: CustomerInfo) => {
    if (!rental) return;
    try {
      // The API call logic is now neatly contained in one place
      const response = await api.put(`/rentals/${rental._id}/customer`, updatedCustomer);
      setRental(response.data); // Update the main rental state
      addAlert('Customer details updated successfully!', 'success');
    } catch (err) { 
      addAlert("Failed to save customer details.", 'danger'); 
    }
  };

  const handlePaymentUiModeChange = (mode: 'Cash' | 'Gcash') => {
    setPaymentUiMode(mode);

    setReceiptFile(null);
    setGcashRef('');
  };

  if (loading) { return <Container className="text-center py-5"><Spinner /></Container>; }
  // --- IMPORTANT: Update the check here to use `rental.customerInfo[0]` ---
  if (!rental || !rental.customerInfo[0]) { return <Container><Alert variant="info">Rental data could not be displayed.</Alert></Container>; }
  
  const canEditDetails = rental.status === 'Pending' ;

  return (
    <Container fluid>
      <Breadcrumb>
        <Breadcrumb.Item onClick={() => navigate('/manageRentals')}>Manage Rentals</Breadcrumb.Item>
        <Breadcrumb.Item active>View Rental</Breadcrumb.Item>
      </Breadcrumb>
      <h2 className="mb-4">Rental Details</h2>

      <Row>
        <Col md={7}>
          <Card className="mb-4">
            <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
              <span>Rental ID: {rental._id}</span>
              <small className="text-muted">Created: {new Date(rental.createdAt).toLocaleDateString()}</small>
            </Card.Header>
            <Card.Body >
              <div className="d-flex justify-content-between align-items-center mb-1">
                <h5 className="mb-0 fw-semibold"><PersonFill className="me-2" />Customer Information</h5>
                {canEditDetails && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowEditCustomerModal(true)}
                  >
                    <PencilSquare className="me-1" /> Edit
                  </Button>
                )}
              </div>
              <div>
                <p className='mb-0'><span className='fw-medium'>Name:</span> {rental.customerInfo[0].name}</p>
                <p className='mb-0'><span className='fw-medium'>Contact:</span> {rental.customerInfo[0].phoneNumber}</p>
                <p className='mb-0'><span className='fw-medium'>Email:</span> {rental.customerInfo[0].email || 'N/A'}</p>
                <div className="d-flex">
                  <div>
                    <span className='fw-medium'>Address:</span>
                    <div className="lh-1">
                      {rental.customerInfo[0].address.street},{" "}
                      {rental.customerInfo[0].address.barangay},{" "}
                      {rental.customerInfo[0].address.city},{" "}
                      {rental.customerInfo[0].address.province}
                    </div>
                  </div>
                </div>
              </div>
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

        <Col md={5}>
          <OrderActions
            rental={rental}
            status={rental.status}
            financials={rental.financials}
            subtotal={rental.financials.subtotal || 0}
            editableDiscount={editableDiscount}
            onDiscountChange={handleDiscountChange}
            onDiscountBlur={handleDiscountBlur}
            editableStartDate={editableStartDate}
            onStartDateChange={setEditableStartDate}
            editableEndDate={editableEndDate}
            canEditDetails={canEditDetails}
            paymentUiMode={paymentUiMode}
            onPaymentUiModeChange={handlePaymentUiModeChange} 
            paymentAmount={paymentAmount}
            onPaymentAmountChange={setPaymentAmount}
            onPaymentAmountBlur={handlePaymentAmountBlur}
            gcashRef={gcashRef}
            onGcashRefChange={setGcashRef}
            onReceiptFileChange={setReceiptFile}
            editableDeposit={editableDeposit}
            onDepositChange={handleDepositChange}
            onDepositBlur={handleDepositBlur}
            onReimburseDeposit={handleReimburseDeposit}
            reimburseAmount={reimburseAmount}
            onReimburseAmountChange={handleReimburseAmountChange}
            onInitiateReturn={handleInitiateReturn}
            onInitiatePickup={handleInitiatePickup}
            onInitiateMarkAsPickedUp={handleInitiateMarkAsPickedUp} 
          />
        </Col>
      </Row>

      <Modal show={showReturnConfirmModal} onHide={() => setShowReturnConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <ExclamationTriangleFill className="me-2 text-warning" />
            Confirm Return
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You are about to mark this rental as returned.
          <br/><br/>
          Paid Deposit: <strong>₱{formatCurrency(rental.financials.depositAmount)}</strong>
          <br/>
          Amount to be Reimbursed: <strong>₱{formatCurrency(parseFloat(reimburseAmount) || 0)}</strong>
          <br/><br/>
          This action will restore item stock and cannot be undone. Are you sure you want to proceed?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReturnConfirmModal(false)}>Cancel</Button>
          <Button variant="warning" onClick={handleConfirmReturn}>Yes, Mark as Returned</Button>
        </Modal.Footer>
      </Modal>

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
        <Modal.Body>
          {/* --- REPLACE the old Modal.Body content with this block --- */}
          <p>
            Are you sure you want to remove the package: <strong>{packageToModify?.name.split(',')[0]}</strong> from this rental?
          </p>
          <p className="mb-0">
            This will return all of its assigned inventory items to stock.
          </p>

          {/* This is the new conditional warning */}
          {packageHasCustomItems && (
            <Alert variant="warning" className="mt-3 mb-0">
              <ExclamationTriangleFill className="me-2" />
              <strong>Important:</strong> This package includes custom-made items. Deleting it will also permanently remove their details from this rental.
            </Alert>
          )}
        </Modal.Body>
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
            Review Incomplete Items
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {canProceedWithWarnings ? (
            <p>
              The following items are incomplete. You can still proceed with the pickup, but please review these issues:
            </p>
          ) : (
            <p>
              This rental cannot be moved to "To Pickup" until the following issues are resolved:
            </p>
          )}
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

          {/* This button ONLY appears if the condition is met */}
          {canProceedWithWarnings && (
            <Button variant="primary" onClick={proceedToUpdateStatus}>
              Proceed Anyway
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      <Modal show={showPickupConfirmModal} onHide={() => setShowPickupConfirmModal(false)} centered>
    <Modal.Header closeButton>
      <Modal.Title>
        <ExclamationTriangleFill className="me-2 text-info" />
        Confirm Action
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      Are you sure you want to move this rental to the "To Pickup" stage?
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={() => setShowPickupConfirmModal(false)}>Cancel</Button>
      <Button variant="primary" onClick={handleConfirmPickup}>Yes, Move to Pickup</Button>
    </Modal.Footer>
  </Modal>

  {/* Confirmation for Mark as Picked Up */}
  <Modal show={showMarkAsPickedUpConfirmModal} onHide={() => setShowMarkAsPickedUpConfirmModal(false)} centered>
    <Modal.Header closeButton>
      <Modal.Title>
        <ExclamationTriangleFill className="me-2 text-info" />
        Confirm Pickup
      </Modal.Title>
    </Modal.Header>
    <Modal.Body>
      Are you sure you want to mark this rental as "Picked Up"? This will finalize the payment and move the rental to the "To Return" stage.
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={() => setShowMarkAsPickedUpConfirmModal(false)}>Cancel</Button>
      <Button variant="info" onClick={handleConfirmMarkAsPickedUp}>Yes, Mark as Picked Up</Button>
    </Modal.Footer>
  </Modal>
      
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

      {showEditItemModal && itemToModify && (
        <SingleItemSelectionModal
          show={showEditItemModal}
          onHide={() => {
            setShowEditItemModal(false);
            setItemToModify(null);
          }}
          // Connect to our new handler function
          onSelect={handleUpdateItemFromSelection}
          addAlert={addAlert}
          mode="rental"
          // Pre-select the item the user is editing
          preselectedItemId={itemToModify?.itemId}
          preselectedVariation={`${itemToModify?.variation.color.name}, ${itemToModify?.variation.size}`}
        />
      )}

      {itemToRentBack && (
          <AddItemFromCustomModal 
              show={showRentBackModal}
              onHide={() => { /* This can be left empty or also trigger the next step */ }}
              onFinished={() => {
                  setShowRentBackModal(false);
                  // Remove the item we just processed from the queue.
                  const newQueue = rentBackQueue.slice(1);
                  setRentBackQueue(newQueue);
                  // Process the next item in the updated queue.
                  processNextInQueue(newQueue);
              }}
              itemToProcess={itemToRentBack}
          />
      )}

      {showEditCustomItemModal && customItemToModify && (
        <CreateEditCustomItemModal
          show={showEditCustomItemModal}
          onHide={() => setShowEditCustomItemModal(false)}
          item={customItemToModify}
          itemName={customItemToModify.name}
          measurementRefs={[]}
          onSave={handleSaveCustomItemChanges}
          isForPackage={isEditingItemForPackage}
          uploadMode="immediate" 
        />
      )}

      <EditCustomerInfoModal
        show={showEditCustomerModal}
        onHide={() => setShowEditCustomerModal(false)}
        customer={rental.customerInfo[0]}
        onSave={handleCustomerSave}
      />
    </Container>
  );
}

export default RentalViewer;