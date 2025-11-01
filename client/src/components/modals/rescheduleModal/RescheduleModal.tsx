// client/src/components/modals/rescheduleModal/RescheduleModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { CalendarEvent, CheckCircleFill, ExclamationTriangleFill } from 'react-bootstrap-icons';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import api from '../../../services/api';
import { useAlert } from '../../../contexts/AlertContext';

interface UnavailableItem {
  name: string;
  variation: string;
}

interface RescheduleModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: (newDate: Date) => Promise<void>;
  entityId: string | null;
  entityType: 'rental' | 'reservation';
  initialDate: Date | null;
  unavailableDates?: Date[];
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  show,
  onHide,
  onConfirm,
  entityId,
  entityType,
  initialDate,
  unavailableDates = []
}) => {
  const { addAlert } = useAlert();
  const [newDate, setNewDate] = useState<Date | null>(null);
  
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<UnavailableItem[] | null>(null);
  const [isCheckedAndValid, setIsCheckedAndValid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (show) {
      setNewDate(initialDate);
      setCheckResult(null);
      setIsCheckedAndValid(false);
    }
  }, [show, initialDate]);

  useEffect(() => {
    if (!newDate || !entityId || !show) {
      return;
    }

    const originalDateString = initialDate ? format(initialDate, 'yyyy-MM-dd') : null;
    const newDateString = format(newDate, 'yyyy-MM-dd');

    if (originalDateString === newDateString) {
        setCheckResult(null);
        setIsCheckedAndValid(false);
        return;
    }

    setIsChecking(true);
    setIsCheckedAndValid(false);
    setCheckResult(null);

    const handler = setTimeout(async () => {
      try {
        const checkUrl = entityType === 'rental'
            ? `/rentals/${entityId}/check-reschedule`
            : `/reservations/${entityId}/check-reschedule`;
        const response = await api.get(checkUrl, { params: { date: newDateString } });
        
        const unavailableItems = response.data.conflictingItems || response.data.unavailableItems || [];
        setCheckResult(unavailableItems);
        
        if (unavailableItems.length === 0) {
          setIsCheckedAndValid(true);
        }
      } catch (err: any) {
        addAlert(err.response?.data?.message || 'Failed to check availability.', 'danger');
        setCheckResult([]);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [newDate, entityId, entityType, initialDate, show, addAlert]);

  const handleConfirm = async () => {
    if (!newDate || !isCheckedAndValid) return;
    
    setIsSaving(true);
    try {
      await onConfirm(newDate);
      onHide();
    } catch (error) {
      // Parent component is expected to show an alert
      console.error("Reschedule confirmation failed:", error);
    } finally {
        setIsSaving(false);
    }
  };

  const isFilterDate = (date: Date): boolean => {
        const day = date.getDay();
        if (day === 0) { // Disable all Sundays
            return false;
        }
        // Check if the date is in the unavailableDates array
        const isUnavailable = unavailableDates.some(
            (unavailableDate) => new Date(unavailableDate).toDateString() === date.toDateString()
        );
        return !isUnavailable;
    };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Reschedule {entityType === 'rental' ? 'Rental' : 'Reservation'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label><CalendarEvent className="me-2"/>Select a New Start Date</Form.Label>
          <DatePicker
            selected={newDate}
            onChange={(date: Date | null) => setNewDate(date)}
            minDate={new Date()}
            filterDate={isFilterDate}
            dateFormat="MMMM d, yyyy"
            className="form-control"
            placeholderText="Select a new date"
            wrapperClassName="w-100"
          />
        </Form.Group>

        <div className="mt-3" style={{ minHeight: '80px' }}>
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
                      <p className="mb-0 fw-bold">{item.name} ({item.variation})</p>
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
          {isSaving ? 'Saving...' : 'Confirm New Date'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};