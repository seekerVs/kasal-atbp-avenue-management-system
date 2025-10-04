import { useState, useEffect, useRef } from 'react';
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
import { Download, ExclamationTriangleFill, PencilSquare, PersonFill, BoxArrowInRight } from 'react-bootstrap-icons';

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
  MeasurementRef,
  ShopSettings,
} from '../../types';
import api, { uploadFile } from '../../services/api';
import CreateEditCustomItemModal from '../../components/modals/createEditCustomItemModal/CreateEditCustomItemModal';
import { EditCustomerInfoModal } from '../../components/modals/editCustomerInfoModal/EditCustomerInfoModal';
import { SelectedItemData, SingleItemSelectionModal } from '../../components/modals/singleItemSelectionModal/SingleItemSelectionModal';
import { ProcessReturnModal, ReturnPayload  } from '../../components/modals/processReturnModal/ProcessReturnModal';
import { CancellationReasonModal } from '../../components/modals/cancellationReasonModal/CancellationReasonModal';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { RentalSummary } from '../../components/rentalSummary/RentalSummary';
import AddItemFromCustomModal from '../../components/modals/addItemFromCustomModal/AddItemFromCustomModal';

// ===================================================================================
// --- MAIN COMPONENT ---
// ===================================================================================
function RentalViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addAlert } = useAlert();
  const [isDownloading, setIsDownloading] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  
  // --- STATE MANAGEMENT ---
  const [rental, setRental] = useState<RentalOrder | null>(null);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [measurementRefs, setMeasurementRefs] = useState<MeasurementRef[]>([]);

  // State for editing customer and order details
  const [editableDiscount, setEditableDiscount] = useState('0');
  const [editableEndDate, setEditableEndDate] = useState('');
  
  // State for payment section
  const [paymentUiMode, setPaymentUiMode] = useState<'Cash' | 'Gcash'>('Cash');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [gcashRef, setGcashRef] = useState('');
  const [editableDeposit, setEditableDeposit] = useState('0');
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
  const [packageHasCustomItems, setPackageHasCustomItems] = useState(false);
  const [canProceedWithWarnings, setCanProceedWithWarnings] = useState(false);
  const [showPickupConfirmModal, setShowPickupConfirmModal] = useState(false);
  const [showMarkAsPickedUpConfirmModal, setShowMarkAsPickedUpConfirmModal] = useState(false);
  const [isEditingItemForPackage, setIsEditingItemForPackage] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [itemsToConvertToInventory, setItemsToConvertToInventory] = useState<CustomTailoringItem[]>([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false); 

  // --- DATA FETCHING & SYNCING ---
  useEffect(() => {
    if (!id) { addAlert("No rental ID provided.", 'danger'); setLoading(false); return; }
    const fetchRentalData = async () => {
      setLoading(true);
      try {
        const [rentalRes, refsRes, settingsRes] = await Promise.all([
          api.get(`/rentals/${id}`),
          api.get('/measurementrefs'),
          api.get('/settings') // Fetch the protected, full settings
        ]);
        setRental(rentalRes.data);
        setMeasurementRefs(refsRes.data);
        setShopSettings(settingsRes.data);
      } catch (err) { 
        console.error("Error fetching data:", err); 
        addAlert("Failed to load rental details.", 'danger');
      } finally { setLoading(false); }
    };
    fetchRentalData();
  }, [id, addAlert]);

  useEffect(() => {
    if (rental) {
        setEditableDiscount(String(rental.financials?.shopDiscount || '0'));
        setEditableEndDate(rental.rentalEndDate);
        setEditableDeposit(String(rental.financials?.depositAmount || '0'));
        if (rental.financials?.payments?.[0]?.referenceNumber) {
          setPaymentUiMode('Gcash');
        } else {
          setPaymentUiMode('Cash');
        }

        setPaymentAmount('0');
    }
  }, [rental]);

  useEffect(() => {
    // This effect acts as the controller for the conversion modal flow.
    if (itemsToConvertToInventory.length > 0) {
      // If there are items in our "To-Do" list, show the modal.
      setShowAddItemModal(true);
    } else {
      // If the list is empty, ensure the modal is hidden.
      setShowAddItemModal(false);
    }
  }, [itemsToConvertToInventory]);

  // --- EVENT HANDLERS ---
  const handleInitiateConversion = () => {
    if (rental && rental.pendingInventoryConversion && rental.pendingInventoryConversion.length > 0) {
      setItemsToConvertToInventory(rental.pendingInventoryConversion);
    } else {
      addAlert("No items are currently pending conversion for this rental.", "info");
    }
  };

  const handleConversionFinished = async (wasSuccessful: boolean) => {
    // This function is called when the AddItemFromCustomModal is closed or saved.
    if (!rental || itemsToConvertToInventory.length === 0) {
      setItemsToConvertToInventory([]); // Safety clear
      return;
    }

    const processedItemId = itemsToConvertToInventory[0]._id;

    if (wasSuccessful) {
      // If the admin saved the item, we need to call the cleanup route
      try {
        const response = await api.delete(`/rentals/${rental._id}/pending-conversion/${processedItemId}`);
        // Update the main rental state to reflect the item's removal from the pending list
        setRental(response.data); 
        // Remove the processed item from our local "To-Do" list
        setItemsToConvertToInventory(prev => prev.slice(1));
        // The useEffect will then either show the next item or close the modal
      } catch (err: any) {
        addAlert(err.response?.data?.message || 'Failed to update rental after conversion.', 'danger');
        // On error, we stop the process to prevent data inconsistency
        setItemsToConvertToInventory([]);
      }
    } else {
      // If the admin clicked "Cancel" or closed the modal, we clear the list to stop the flow.
      // The items remain in the `pendingInventoryConversion` array on the backend to be processed later.
      addAlert('Inventory conversion cancelled. You can resume this process later.', 'info');
      setItemsToConvertToInventory([]);
    }
  };

  const handleSendReminder = async () => {
    if (!rental) return;

    setIsSendingReminder(true);
    try {
      // Call the new backend endpoint we created in the previous phase
      const response = await api.post(`/rentals/${rental._id}/send-reminder`);
      
      // Update the main rental state with the response data from the API
      setRental(response.data);
      addAlert('Return reminder email sent successfully!', 'success');
    } catch (err: any) {
      addAlert(err.response?.data?.message || 'Failed to send reminder.', 'danger');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleDownloadPdf = () => {
    const input = summaryRef.current;
    if (!input || !rental) {
      addAlert('Could not generate PDF, content not found.', 'danger');
      return;
    }

    setIsDownloading(true);

    html2canvas(input, { scale: 2, backgroundColor: null })
      .then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        // A4 page is 210mm wide. Use 190mm for content with 10mm margins.
        const contentWidth = 190;
        const canvasAspectRatio = canvas.width / canvas.height;
        const contentHeight = contentWidth / canvasAspectRatio;
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Check if content is taller than one page
        if (contentHeight > pdfHeight - 20) {
            // This is a simplified handling for multi-page. More complex logic could be added.
            console.warn("PDF content might be too long for a single page.");
        }

        pdf.addImage(imgData, 'PNG', 10, 10, contentWidth, contentHeight);
        pdf.save(`rental-summary-${rental._id}.pdf`);
      })
      .catch((err) => {
        console.error("PDF generation failed:", err);
        addAlert('Could not generate PDF. Please try again.', 'danger');
      })
      .finally(() => {
        setIsDownloading(false);
      });
  };
  
  const handleInitiatePickup = () => {
    // You can perform any pre-modal checks here if needed in the future
    setShowPickupConfirmModal(true);
  };

  const handleInitiateMarkAsPickedUp = () => {
    // This will trigger the confirmation before calling the main logic
    setShowMarkAsPickedUpConfirmModal(true);
  };


  const handleProcessReturn = async (payload: ReturnPayload) => {
    if (!rental) return;

    try {
      const response = await api.put(`/rentals/${rental._id}/process-return`, payload);
      const updatedRental = response.data;
      setRental(updatedRental); // Update the main rental state first
      addAlert('Rental return processed successfully!', 'success');
      
      // Check if the backend returned any items that need to be converted
      if (updatedRental.pendingInventoryConversion && updatedRental.pendingInventoryConversion.length > 0) {
        setItemsToConvertToInventory(updatedRental.pendingInventoryConversion);
      }
    } catch (err: any) {
      addAlert(err.response?.data?.message || "Failed to process the return.", 'danger');
    } finally {
      setShowReturnModal(false);
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

  const handleUpdateAndPay = async (updateFields: { status?: RentalStatus; rentalStartDate?: string; rentalEndDate?: string; shopDiscount?: number; depositAmount?: number; depositReimbursed?: number; }) => {
    if (!rental) return;

    const payload: any = { ...updateFields };

    // 2. Centrally handle adding the payment object if an amount is entered.
    const amountToPay = parseFloat(paymentAmount) || 0;
    if (amountToPay > 0) {
        payload.payment = {
            amount: amountToPay,
            referenceNumber: paymentUiMode === 'Gcash' ? gcashRef : null,
            // receiptImageUrl will be added below after upload
        };
    }
    
    try {
      // 3. Centrally handle the file upload.
      if (payload.payment && paymentUiMode === 'Gcash' && receiptFile) {
        addAlert('Uploading receipt...', 'info');
        const uploadedUrl = await uploadFile(receiptFile);
        payload.payment.receiptImageUrl = uploadedUrl;
      }
      
      const depositInput = parseFloat(editableDeposit) || 0;
      payload.depositAmount = depositInput;
    
      const response = await api.put(`/rentals/${rental._id}/process`, payload);
      setRental(response.data);
      addAlert('Rental updated successfully!', 'success');

      setPaymentUiMode('Cash');
      setPaymentAmount('0');
      setGcashRef('');
      setReceiptFile(null);
      
    } catch (err: any) { 
      addAlert(err.response?.data?.message || "Failed to update details.", 'danger');
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

  const proceedToUpdateStatus = async () => {
    if (!rental) return;
    setShowValidationModal(false);

    // Just pass the fields that are changing for this specific action.
    await handleUpdateAndPay({
        status: 'To Pickup',
        shopDiscount: parseFloat(editableDiscount) || 0,
    });
  };


  const handleConfirmMarkAsPickedUp = async () => {
    setShowMarkAsPickedUpConfirmModal(false);
    if (!rental) return;

    // Just pass the fields that are changing for this specific action.
    // The payment object will be constructed automatically by handleUpdateAndPay.
    await handleUpdateAndPay({
        status: 'To Return',
        shopDiscount: parseFloat(editableDiscount) || 0,
    });
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
    const isFromPackage = rental.packageRents.some(pkg => 
        pkg.packageFulfillment.some(fulfill => {
            if (!fulfill.isCustom) return false;
            const assigned = fulfill.assignedItem;
            if (assigned && 'itemId' in assigned) {
                return assigned.itemId === itemToEdit._id;
            }
            return false;
        })
    );
    setCustomItemToModify(itemToEdit);
    setIsEditingItemForPackage(isFromPackage);
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

   const handleConfirmCancellation = async (reason: string) => {
    if (!rental) return;

    // The modal already validates that the reason is not empty.
    
    setShowCancelModal(false); // Close the modal immediately
    // Consider adding an isSaving state if the API call is slow
    try {
      // Call the new backend route
      const response = await api.put(`/rentals/${rental._id}/cancel`, { reason });
      setRental(response.data);
      addAlert('Rental has been successfully cancelled.', 'success');
    } catch (err: any)      {
      addAlert(err.response?.data?.message || "Failed to cancel rental.", 'danger');
    }
  };

  const handlePaymentAmountBlur = () => {
    // If the payment amount input is empty when the user clicks away,
    // set it back to "0" to prevent validation issues.
    if (paymentAmount.trim() === '') {
      setPaymentAmount('0');
    }
  };

  const handleInitiateReturn = () => {
    setShowReturnModal(true);
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
  
  const canEditDetails = rental.status === 'Pending' || rental.status === 'To Pickup';
  const canDeleteItems = rental.status === 'Pending';

  return (
    <>
      <div style={{ position: 'fixed', left: '-2000px', top: 0 }}>
        <RentalSummary ref={summaryRef} rental={rental} shopSettings={shopSettings} />
      </div>

      <Container fluid>
        <Breadcrumb>
          <Breadcrumb.Item onClick={() => navigate('/manageRentals')}>Manage Orders</Breadcrumb.Item>
          <Breadcrumb.Item active>View Order</Breadcrumb.Item>
        </Breadcrumb>
        <Row>
          <Col md={7}>
            <Card className="mb-4">
              <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
                <span>ID: {rental._id}</span>
                <div className="d-flex align-items-center gap-2">
                  <small className="text-muted">Created: {new Date(rental.createdAt).toLocaleDateString()}</small>
                  {/* --- (6) ADD THE DOWNLOAD BUTTON --- */}
                  <Button variant="outline-primary" size="sm" onClick={handleDownloadPdf} disabled={isDownloading}>
                    {isDownloading ? (
                      <Spinner as="span" size="sm" className="me-1" />
                    ) : (
                      <Download className="me-1" />
                    )}
                    Summary
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {rental.status === 'Completed' && rental.pendingInventoryConversion && rental.pendingInventoryConversion.length > 0 && (
                  <Alert variant="info" className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>Action Required:</strong> This rental has items that need to be added to the main inventory.
                    </div>
                    <Button variant="primary" size="sm" onClick={handleInitiateConversion}>
                      <BoxArrowInRight className="me-2"/>
                      Process Items
                    </Button>
                  </Alert>
                )}
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
                <div className='lh-sm'>
                  <p className='mb-0'><span className='fw-medium'>Name:</span> {rental.customerInfo[0].name}</p>
                  <p className='mb-0'><span className='fw-medium'>Contact:</span> {rental.customerInfo[0].phoneNumber}</p>
                  <p className='mb-0'><span className='fw-medium'>Email:</span> {rental.customerInfo[0].email || 'N/A'}</p>
                  <p>
                    <span className='fw-medium'>Address: </span>
                      {rental.customerInfo[0].address.street},
                      {rental.customerInfo[0].address.barangay},
                      {rental.customerInfo[0].address.city},
                      {rental.customerInfo[0].address.province}
                  </p>
                </div>
                <RentalItemsList
                  singleRents={rental.singleRents}
                  packageRents={rental.packageRents}
                  customTailoring={rental.customTailoring}
                  canEditDetails={canEditDetails}
                  canDeleteItems={canDeleteItems}
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
              editableStartDate={rental.rentalStartDate}
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
              onInitiateReturn={handleInitiateReturn}
              onInitiatePickup={handleInitiatePickup}
              onInitiateMarkAsPickedUp={handleInitiateMarkAsPickedUp}
              onInitiateCancel={() => setShowCancelModal(true)}
              onInitiateSendReminder={handleSendReminder}
              isSendingReminder={isSendingReminder}
              returnReminderSent={rental.returnReminderSent || false}
            />
          </Col>
        </Row>
        {showReturnModal && (
          <ProcessReturnModal
            show={showReturnModal}
            onHide={() => setShowReturnModal(false)}
            rental={rental}
            onSubmit={handleProcessReturn}
          />
        )}
        {rental && (
          <CancellationReasonModal
            show={showCancelModal}
            onHide={() => setShowCancelModal(false)}
            onConfirm={handleConfirmCancellation}
            title="Confirm Rental Cancellation"
            itemType="rental"
            itemId={rental._id}
          />
        )}
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
      
        {/* Confirmation for     Picked Up */}
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
            onSave={handleSavePackageChanges}
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
            confirmButtonText={rental.status === 'To Pickup' ? 'Save Changes' : undefined}
            disableQuantity={rental.status === 'To Pickup'}
          />
        )}
        {showEditCustomItemModal && customItemToModify && (
          <CreateEditCustomItemModal
            show={showEditCustomItemModal}
            onHide={() => setShowEditCustomItemModal(false)}
            item={customItemToModify}
            itemName={customItemToModify.name}
            measurementRefs={measurementRefs}
            onSave={handleSaveCustomItemChanges}
            isForPackage={isEditingItemForPackage}
            uploadMode="immediate"
            initialFittingDate={customItemToModify.fittingDate}
            isFittingDateDisabled={isEditingItemForPackage || rental.status === 'To Pickup'}
          />
        )}
        <EditCustomerInfoModal
          show={showEditCustomerModal}
          onHide={() => setShowEditCustomerModal(false)}
          customer={rental.customerInfo[0]}
          onSave={handleCustomerSave}
        />
      </Container>
      {showAddItemModal && itemsToConvertToInventory.length > 0 && (
        <AddItemFromCustomModal
          show={showAddItemModal}
          onFinished={handleConversionFinished}
          itemToProcess={itemsToConvertToInventory[0]}
        />
      )}
    </>
  );
}

export default RentalViewer;