import React, { useState, useEffect } from 'react';
import { Modal, Button, ListGroup, Spinner, Alert, Form } from 'react-bootstrap';
import { format } from 'date-fns';

import { RentalOrder, Appointment } from '../../../types';
import api from '../../../services/api';

interface AddToRentalModalProps {
  show: boolean;
  onHide: () => void;
  appointment: Appointment;
  customerPhoneNumber: string;
  onSuccess: (rentalId: string) => void;
}

export const AddToRentalModal: React.FC<AddToRentalModalProps> = ({ show, onHide, appointment, customerPhoneNumber, onSuccess }) => {
  const [existingRentals, setExistingRentals] = useState<RentalOrder[]>([]);
  const [selectedRentalId, setSelectedRentalId] = useState<string>('__CREATE_NEW__');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      const fetchRentals = async () => {
        setLoading(true);
        setError(null);
        try {
          // Fetch only "To Process" rentals for this specific customer
          const response = await api.get(`/rentals?customerPhoneNumber=${customerPhoneNumber}&status=To Process`);
          setExistingRentals(response.data || []);
        } catch (err) {
          setError('Failed to load existing rentals for this customer.');
        } finally {
          setLoading(false);
        }
      };
      fetchRentals();
    }
  }, [show, customerPhoneNumber]);

  const handleSubmit = async () => {
    if (!appointment.processedItemData) {
        setError('Cannot proceed: Processed item data is missing from the appointment.');
        return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
        let rentalId;
        if (selectedRentalId === '__CREATE_NEW__') {
            // Logic to create a new rental will be handled by the backend
            // The endpoint is designed to create a new rental if no ID is provided
            // For now, we'll imagine a dedicated endpoint or a smart one.
            // Let's assume a new endpoint for clarity.
            const response = await api.post(`/rentals/from-booking`, {
                bookingId: appointment.appointmentId, // Pass a reference
                customTailoring: [appointment.processedItemData]
            });
            rentalId = response.data._id;

        } else {
            // Logic to add the item to an existing rental
            await api.put(`/rentals/${selectedRentalId}/addItem`, {
                customTailoring: [appointment.processedItemData]
            });
            rentalId = selectedRentalId;
        }
        onSuccess(rentalId); // Pass the final rentalId back to the parent
    } catch (err: any) {
        setError(err.response?.data?.message || 'An error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Add Custom Item to Rental</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>You are adding the item: <strong>"{appointment.processedItemData?.name}"</strong></p>
        <hr />
        
        {loading ? (
            <div className="text-center"><Spinner /></div>
        ) : error ? (
            <Alert variant="danger">{error}</Alert>
        ) : (
          <Form.Group>
            <Form.Label>Choose an Action</Form.Label>
            <Form.Select value={selectedRentalId} onChange={e => setSelectedRentalId(e.target.value)}>
              <option value="__CREATE_NEW__">Create a New Rental for this Item</option>
              {existingRentals.length > 0 && <option disabled>--- OR ---</option>}
              {existingRentals.map(rental => (
                <option key={rental._id} value={rental._id}>
                  Add to existing rental ({rental._id}) from {format(new Date(rental.createdAt), 'MMM dd, yyyy')}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        )}
        
        {selectedRentalId !== '__CREATE_NEW__' && (
            <Alert variant="info" className="mt-3 small">
                This will add the custom item to the selected rental which is currently in the "To Process" stage.
            </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={loading || isSubmitting}>
          {isSubmitting ? <Spinner as="span" size="sm" /> : 'Confirm Action'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};