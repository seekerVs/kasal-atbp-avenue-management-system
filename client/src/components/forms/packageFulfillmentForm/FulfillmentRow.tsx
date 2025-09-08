import React, { useEffect, useState } from 'react';
import { Form, Button, Image, Badge } from 'react-bootstrap';
import { PencilSquare, PlusCircle, Trash } from 'react-bootstrap-icons';
import { NormalizedFulfillmentItem } from '../../../types';

// This interface reuses parts of the main form's props
// It defines exactly what this specific row component needs to function.
interface FulfillmentRowProps {
  fulfillItem: NormalizedFulfillmentItem;
  index: number;
  errors: { index: number; field: 'wearerName' | 'notes'; message: string; }[];
  mode: 'reservation' | 'rental';
  onWearerNameChange: (index: number, name: string) => void;
  onCustomItemNoteChange?: (index: number, note: string) => void;
  onOpenCustomItemModal?: (index: number) => void;
  onOpenAssignmentModal?: (index: number) => void;
  onClearAssignment?: (index: number) => void;
  onOpenSizeSelectionModal?: (index: number) => void;
}

export const FulfillmentRow: React.FC<FulfillmentRowProps> = ({
  fulfillItem,
  index,
  errors,
  mode,
  onWearerNameChange,
  onCustomItemNoteChange,
  onOpenCustomItemModal,
  onOpenAssignmentModal,
  onClearAssignment,
  onOpenSizeSelectionModal,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const { isCustom, assignedItem } = fulfillItem;

  useEffect(() => {
    let objectUrl: string | null = null;
    // The source can be a File object (for new uploads) or a string (for existing URLs)
    const imageSource = assignedItem.imageUrl;

    if (imageSource instanceof File) {
      objectUrl = URL.createObjectURL(imageSource);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(imageSource);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [assignedItem.imageUrl]);

  const wearerNameError = errors.find(e => e.index === index && e.field === 'wearerName');
  const notesError = errors.find(e => e.index === index && e.field === 'notes');
  const hasAssignedInventoryItem = !!assignedItem.itemId && !!assignedItem.variation;
  const hasAssignedCustomItem = !!assignedItem.outfitCategory;

  return (
    <tr>
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
          {!isCustom && (
            // Only render the Image for non-custom items
            <Image src={previewUrl || 'https://placehold.co/50x50/e9ecef/adb5bd?text=N/A'} rounded style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '0.75rem' }} />
          )}
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
                <Button variant="outline-secondary" size="sm" onClick={() => onOpenAssignmentModal(index)} title={hasAssignedInventoryItem ? 'Change Item' : 'Assign Item'}><PencilSquare /></Button>
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
};