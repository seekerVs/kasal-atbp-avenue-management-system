// frontend/src/components/fulfillmentDetailsTable/FulfillmentDetailsTable.tsx

import React from 'react';
import { Table, Image, Badge } from 'react-bootstrap';
import { PackageFulfillment, CustomTailoringItem } from '../../../types';

interface FulfillmentDetailsTableProps {
  fulfillmentData: PackageFulfillment[];
}

export const FulfillmentDetailsTable: React.FC<FulfillmentDetailsTableProps> = ({ fulfillmentData }) => {
  
  const renderAssignedItem = (fulfill: PackageFulfillment) => {
    const assignedItem = fulfill.assignedItem || {};

    // --- RENDER LOGIC FOR STANDARD INVENTORY ITEMS ---
    if ('itemId' in assignedItem && assignedItem.itemId) {
      return (
        <div className="d-flex align-items-center">
          <Image 
            src={assignedItem.imageUrl || 'https://placehold.co/60x60/e9ecef/adb5bd?text=N/A'} 
            rounded 
            style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '0.75rem' }} 
          />
          <div className="lh-1">
            <p className="mb-1 fw-semibold">{assignedItem.name}</p>
            <small className="text-muted">{assignedItem.variation}</small>
          </div>
        </div>
      );
    }
    
    // --- RENDER LOGIC FOR CUSTOM TAILORING ITEMS ---
    if (fulfill.isCustom) {
      const customItem = assignedItem as CustomTailoringItem;
      // Check if details have been added
      if (customItem && 'outfitCategory' in customItem) {
        return (
          <div className="d-flex align-items-center">
            <Image 
              src={customItem.referenceImages?.[0] || 'https://placehold.co/60x60/6c757d/white?text=Custom'} 
              rounded 
              style={{ width: '50px', height: '50px', objectFit: 'cover', marginRight: '0.75rem' }} 
            />
            <div className="lh-1">
              <p className="mb-1 fw-semibold">{customItem.name}</p>
              <Badge pill bg="info">Custom Details Added</Badge>
            </div>
          </div>
        );
      }
      // Render placeholder if it's a custom slot with no details yet
      return <Badge bg="light" text="dark">Custom Tailoring Slot</Badge>;
    }

    // --- FALLBACK FOR UNASSIGNED SLOTS ---
    return <span className="text-muted fst-italic">Not Assigned</span>;
  };
  

  return (
    <Table hover responsive className="align-middle mb-0">
      <thead className="table-light">
        <tr>
          <th style={{ width: '30%' }}>Role</th>
          <th style={{ width: '30%' }}>Wearer Name</th>
          <th style={{ width: '40%' }}>Assigned Item</th>
        </tr>
      </thead>
      <tbody>
        {fulfillmentData.map((fulfill, index) => (
          <tr key={index}>
            <td className="fw-medium">{fulfill.role}</td>
            <td>{fulfill.wearerName || <span className="text-muted fst-italic">Not Set</span>}</td>
            <td>{renderAssignedItem(fulfill)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};