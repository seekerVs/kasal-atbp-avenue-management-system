import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { CalendarEvent, CheckCircleFill, ExclamationTriangleFill } from 'react-bootstrap-icons';
import DatePicker from 'react-datepicker';
import { format, getDay } from 'date-fns';
import api from '../../../services/api';
import { InventoryItem, Reservation, UnavailabilityRecord } from '../../../types';
import { useAlert } from '../../../contexts/AlertContext';

// The data structure for unavailable items returned by our new API
interface UnavailableItem {
  itemName: string;
  variation: string;
  requested: number;
  available: number;
}

// The props our new modal will accept
interface RescheduleReservationModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: (newDate: Date) => Promise<void>; 
  reservation: Reservation | null;
}

export const RescheduleReservationModal: React.FC<RescheduleReservationModalProps> = ({
  show,
  onHide,
  onConfirm,
  reservation
}) => {
  const { addAlert } = useAlert();
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  
  // State for the availability check process
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<UnavailableItem[] | null>(null);
  const [isCheckedAndValid, setIsCheckedAndValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all shop closure dates when the modal opens
  useEffect(() => {
    if (show) {
      // Reset state when modal opens
      setNewDate(reservation ? new Date(reservation.reserveDate) : null);
      setCheckResult(null);
      setIsCheckedAndValid(false);

      const fetchUnavailability = async () => {
        try {
          const response = await api.get('/unavailability');
          setUnavailableDates(response.data.map((rec: UnavailabilityRecord) => new Date(rec.date)));
        } catch (err) {
          console.error("Failed to fetch unavailable dates for reschedule modal.", err);
        }
      };
      fetchUnavailability();
    }
  }, [show, reservation]);

  useEffect(() => {
    // Don't run if there's no date or reservation, or on initial load
    if (!newDate || !reservation || !show) {
      return;
    }

    // Immediately clear old results and show a loading state
    setCheckResult(null);
    setIsCheckedAndValid(false);
    setIsChecking(true);

    // Set up a timer to delay the API call
    const handler = setTimeout(async () => {
      // Compile the list of items to check
      const itemsToCheck = [
        ...reservation.itemReservations.map(item => ({
          itemId: item.itemId, name: item.itemName,
          variation: `${item.variation.color.name}, ${item.variation.size}`,
          quantity: item.quantity,
        })),
        ...reservation.packageReservations.flatMap(pkg =>
          pkg.fulfillmentPreview
            .filter(f => !f.isCustom && f.assignedItemId && typeof f.assignedItemId === 'object' && f.variation)
            .map(f => {
              // The assignedItemId is a populated InventoryItem object here. We need its _id.
              const assignedItem = f.assignedItemId as InventoryItem;
              return {
                itemId: assignedItem._id, // <-- THE FIX IS HERE
                name: `Item for ${f.role}`,
                variation: f.variation!, 
                quantity: 1,
              }
            })
        )
      ];

      try {
        const response = await api.post('/reservations/check-availability', {
          newDate: format(newDate, 'yyyy-MM-dd'),
          items: itemsToCheck,
          reservationIdToExclude: reservation._id,
        });

        const result: UnavailableItem[] = response.data.unavailableItems;
        setCheckResult(result);
        
        if (result.length === 0) {
          setIsCheckedAndValid(true);
        }
      } catch (err: any) {
        addAlert(err.response?.data?.message || 'Failed to check availability.', 'danger');
        setCheckResult([]); // Set to empty array on error to hide loading spinner
      } finally {
        setIsChecking(false);
      }
    }, 500); // 500ms debounce delay

    // Cleanup function: If the user selects another date, cancel the pending check
    return () => {
      clearTimeout(handler);
    };
  }, [newDate, reservation, show, addAlert]);

  const handleDateChange = (date: Date | null) => {
    setNewDate(date);
    // Reset the check status whenever the date changes
    setCheckResult(null);
    setIsCheckedAndValid(false);
  };
  
  const handleConfirm = async () => {
    if (!newDate || !isCheckedAndValid) return;
    
    setIsSaving(true);
    try {
      // Call the parent's onConfirm function, which handles the final API call
      await onConfirm(newDate);
      onHide(); // Close the modal on success
    } catch (error) {
        // The parent component is expected to show an alert on failure
        console.error("Reschedule confirmation failed:", error)
    } finally {
        setIsSaving(false);
    }
  };

  const isFilterDate = (date: Date): boolean => {
    const day = getDay(date);
    return day !== 0 && !unavailableDates.some(d => d.toDateString() === date.toDateString());
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Reschedule Reservation</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label><CalendarEvent className="me-2"/>Select a New Reservation Date</Form.Label>
          <DatePicker
            selected={newDate}
            onChange={handleDateChange}
            minDate={new Date()}
            filterDate={isFilterDate}
            dateFormat="MMMM d, yyyy"
            className="form-control"
            placeholderText="Select a new date"
            wrapperClassName="w-100"
          />
        </Form.Group>

        {/* --- Status Display Area --- */}
        <div className="mt-3">
          {isChecking ? (
            <Alert variant="secondary" className="text-center">
              <Spinner as="span" size="sm" className="me-2" />
              Checking availability...
            </Alert>
          ) : checkResult && (
            checkResult.length === 0 ? (
              <Alert variant="success" className="text-center">
                <CheckCircleFill className="me-2" />
                All items are available for the selected date!
              </Alert>
            ) : (
              <Alert variant="danger">
                <Alert.Heading as="h6">
                  <ExclamationTriangleFill className="me-2" />
                  Some items are unavailable:
                </Alert.Heading>
                <ListGroup variant="flush">
                  {checkResult.map((item, index) => (
                    <ListGroup.Item key={index} className="bg-transparent border-0 px-2 py-1">
                      <p className="mb-0 fw-bold">{item.itemName} ({item.variation})</p>
                      <p className="small mb-0">Requested: {item.requested}, Available: {item.available}</p>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Alert>
            )
          )}
        </div>

      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Cancel</Button>
        <Button 
          variant="primary" 
          onClick={handleConfirm} 
          disabled={!isCheckedAndValid || isSaving}
        >
          {isSaving ? 'Saving...' : 'Confirm Reschedule'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};