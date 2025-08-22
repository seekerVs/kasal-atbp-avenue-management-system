import React, { useMemo } from 'react';
import { Form, Button, Table, Image, Badge } from 'react-bootstrap';
import { PencilSquare, PlusCircle, Trash } from 'react-bootstrap-icons';
import { NormalizedFulfillmentItem } from '../../../types';
import './packageFulfillmentForm.css';
import { DateTimePicker } from '../../dateTimePicker/DateTimePicker';

export interface FulfillmentError {
  index: number;
  field: 'wearerName' | 'notes';
  message: string;
}

interface PackageFulfillmentFormProps {
  fulfillmentData: NormalizedFulfillmentItem[];
  errors: FulfillmentError[];
  onWearerNameChange: (index: number, name: string) => void;
  mode: 'reservation' | 'rental';
  appointmentDate?: Date | null;
  unavailableDates?: Date[];
  onAppointmentDateChange?: (date: Date | null) => void;
  onCustomItemNoteChange?: (index: number, note: string) => void;
  onOpenSizeSelectionModal?: (index: number) => void;
  onOpenAssignmentModal?: (index: number) => void;
  onOpenCustomItemModal?: (index: number) => void;
  onClearAssignment?: (index: number) => void;
}
export const PackageFulfillmentForm: React.FC<PackageFulfillmentFormProps> = ({
  fulfillmentData,
  errors,
  onWearerNameChange,
  mode,
  appointmentDate,
  unavailableDates = [],
  onAppointmentDateChange,
  onCustomItemNoteChange,
  onOpenSizeSelectionModal,
  onOpenAssignmentModal,
  onOpenCustomItemModal,
  onClearAssignment,
}) => {
  const hasCustomItems = fulfillmentData.some(item => item.isCustom);

  return (
    <>
      {mode === 'reservation' && hasCustomItems && (
        <Form.Group className="mb-3 p-3 bg-light border rounded">
          <Form.Label className="fw-bold">Select Appointment Date & Time</Form.Label>
          <DateTimePicker
              selectedDate={appointmentDate || null}
              onChange={onAppointmentDateChange || (() => {})}
              unavailableDates={unavailableDates}
              minDate={new Date()}
          />
          <Form.Text>This single appointment will be for all custom-made items in this package.</Form.Text>
        </Form.Group>
      )}

      <div className="table-responsive">
        <Table hover responsive className="align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th style={{ width: '25%' }}>Role</th>
              <th style={{ width: '25%' }}>Wearer Name</th>
              <th style={{ width: '35%' }}>Assigned Item</th>
              <th style={{ width: '15%' }} className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fulfillmentData.map((fulfillItem, index) => {
              const wearerNameError = errors.find(e => e.index === index && e.field === 'wearerName');
              const notesError = errors.find(e => e.index === index && e.field === 'notes');
              const { isCustom, assignedItem } = fulfillItem;
              const hasAssignedInventoryItem = !!assignedItem.itemId && !!assignedItem.variation;
              const hasAssignedCustomItem = !!assignedItem.outfitCategory;

              return (
                <tr key={index}>
                  <td className="fw-medium">{fulfillItem.role}</td>
                  <td>
                    <Form.Control 
                      size="sm" 
                      type="text" 
                      placeholder="Enter wearer's name" 
                      value={fulfillItem.wearerName || ''} 
                      onChange={(e) => onWearerNameChange(index, e.target.value)}
                      isInvalid={!!wearerNameError}
                    />
                    {wearerNameError && <Form.Control.Feedback type="invalid" className="small">{wearerNameError.message}</Form.Control.Feedback>}
                  </td>
                  <td>
                    <div className="d-flex align-items-center">
                      <Image src={assignedItem.imageUrl || 'https://placehold.co/50x50/e9ecef/adb5bd?text=N/A'} rounded style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '0.75rem' }} />
                      <div className="lh-1">
                        <p className={`mb-1 ${hasAssignedInventoryItem || hasAssignedCustomItem ? 'fw-medium' : 'text-muted fst-italic'}`}>{assignedItem.name || 'Not Assigned'}</p>
                        {hasAssignedInventoryItem && <small className="text-muted">{assignedItem.variation}</small>}
                        {mode === 'reservation' && isCustom && <Form.Control as="textarea" rows={1} size="sm" placeholder="Notes..." value={fulfillItem.notes || ''} onChange={(e) => onCustomItemNoteChange?.(index, e.target.value)} isInvalid={!!notesError} />}
                        {hasAssignedCustomItem && <Badge pill bg="info">Custom Details Added</Badge>}
                        {isCustom && !hasAssignedCustomItem && <Badge bg="light" text="dark">Custom Tailoring Slot</Badge>}
                      </div>
                    </div>
                  </td>
                  <td className="text-end">
                    {mode === 'rental' ? (
                      <div className="d-flex gap-2 justify-content-end">
                        {isCustom && onOpenCustomItemModal && (
                           <Button variant={hasAssignedCustomItem ? "outline-success" : "outline-info"} size="sm" onClick={() => onOpenCustomItemModal(index)} title={hasAssignedCustomItem ? 'Edit Details' : 'Create Item'}><PlusCircle /></Button>
                        )}
                        {!isCustom && onOpenAssignmentModal && (
                           <Button variant="outline-primary" size="sm" onClick={() => onOpenAssignmentModal(index)} title={hasAssignedInventoryItem ? 'Change Item' : 'Assign Item'}><PencilSquare /></Button>
                        )}
                        {(hasAssignedInventoryItem || hasAssignedCustomItem) && onClearAssignment && (
                           <Button variant="outline-danger" size="sm" onClick={() => onClearAssignment(index)} title="Clear Assignment"><Trash /></Button>
                        )}
                      </div>
                    ) : ( // Reservation Mode
                       !isCustom && hasAssignedInventoryItem && onOpenSizeSelectionModal && (
                         <Button variant="outline-primary" size="sm" onClick={() => onOpenSizeSelectionModal(index)}>
                           <PencilSquare className="me-1"/> Change Size
                         </Button>
                       )
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </>
  );
};