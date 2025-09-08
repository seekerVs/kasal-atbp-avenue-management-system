import React, { useMemo } from 'react';
import { Form, Button, Table, Image, Badge } from 'react-bootstrap';
import { NormalizedFulfillmentItem } from '../../../types';
import './packageFulfillmentForm.css';
import { DayBlockPicker } from '../../dayBlockPicker/DayBlockPicker';
import { FulfillmentRow } from './FulfillmentRow';

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
  onAppointmentDateChange?: (date: Date | null, block: 'morning' | 'afternoon' | '') => void;
  onCustomItemNoteChange?: (index: number, note: string) => void;
  onOpenSizeSelectionModal?: (index: number) => void;
  onOpenAssignmentModal?: (index: number) => void;
  onOpenCustomItemModal?: (index: number) => void;
  onClearAssignment?: (index: number) => void;
  selectedBlock?: 'morning' | 'afternoon' | '';
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
  selectedBlock,
}) => {
  const hasCustomItems = fulfillmentData.some(item => item.isCustom);

  return (
    <>
      {mode === 'reservation' && hasCustomItems && (
        <Form.Group className="mb-3">
          <Form.Label className="fw-bold">Select Appointment Date & Time</Form.Label>
          <DayBlockPicker
              selectedDate={appointmentDate || null}
              selectedBlock={selectedBlock || ''}
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
              return (
                <FulfillmentRow
                  key={index}
                  index={index}
                  fulfillItem={fulfillItem}
                  errors={errors}
                  mode={mode}
                  onWearerNameChange={onWearerNameChange}
                  onCustomItemNoteChange={onCustomItemNoteChange}
                  onOpenCustomItemModal={onOpenCustomItemModal}
                  onOpenAssignmentModal={onOpenAssignmentModal}
                  onClearAssignment={onClearAssignment}
                  onOpenSizeSelectionModal={onOpenSizeSelectionModal}
                />
              );
            })}
          </tbody>
        </Table>
      </div>
    </>
  );
};