import React from 'react';
import { Form, Button, Row, Col } from 'react-bootstrap';
import { BoxSeam, Palette } from 'react-bootstrap-icons';
import { Package, PackageReservation } from '../../types';

interface PackageReservationAdderProps {
  packages: Package[];
  onAdd: (pkg: PackageReservation) => void;
}

export const PackageReservationAdder: React.FC<PackageReservationAdderProps> = ({ packages, onAdd }) => {
  const [selectedPackageId, setSelectedPackageId] = React.useState('');
  const [selectedMotifId, setSelectedMotifId] = React.useState('');

  const selectedPackage = packages.find(p => p._id === selectedPackageId);
  
  const handleAddClick = () => {
    if (!selectedPackage) return;
    const selectedMotif = selectedPackage.colorMotifs.find(m => m._id === selectedMotifId);
    
    const sourceArray = selectedMotif?.assignments || selectedPackage.inclusions.map(inc => ({ role: inc, isCustom: false }));

    const fulfillmentPreview = sourceArray.map(assign => {
      // Check if 'itemId' exists on the 'assign' object before trying to access it.
      // This acts as a type guard for TypeScript.
      if ('itemId' in assign) {
        return {
          role: assign.role,
          isCustom: !!assign.isCustom,
          assignedItemId: assign.itemId,
          variation: assign.variation
        };
      }
      
      // If 'itemId' does not exist, we know it's the simpler { role, isCustom } shape.
      // We return an object that matches the FulfillmentPreview type without the missing properties.
      return {
        role: assign.role,
        isCustom: !!assign.isCustom,
      };
    });
    
    onAdd({
      packageReservationId: '', // Parent will generate
      status: 'Reserved',
      packageId: selectedPackage._id,
      packageName: selectedPackage.name,
      price: selectedPackage.price,
      motifName: selectedMotif?.motifName,
      fulfillmentPreview: fulfillmentPreview,
    });
    // Reset form
    setSelectedPackageId('');
    setSelectedMotifId('');
  };

  return (
    <div>
      <Row>
        <Col md={7}>
          <Form.Group className="mb-3">
            <Form.Label><BoxSeam className="me-2"/>Package</Form.Label>
            <Form.Select value={selectedPackageId} onChange={e => { setSelectedPackageId(e.target.value); setSelectedMotifId(''); }}>
              <option value="">Select a package...</option>
              {packages.map(p => <option key={p._id} value={p._id}>{p.name} (₱{p.price.toLocaleString()})</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={5}>
          <Form.Group className="mb-3">
            <Form.Label><Palette className="me-2"/>Motif</Form.Label>
            <Form.Select value={selectedMotifId} onChange={e => setSelectedMotifId(e.target.value)} disabled={!selectedPackage || selectedPackage.colorMotifs.length === 0}>
              <option value="">{selectedPackage ? 'Select a motif (Optional)' : 'Select package first'}</option>
              {selectedPackage?.colorMotifs.map(m => <option key={m._id} value={m._id}>{m.motifName}</option>)}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <div className="d-grid">
        <Button onClick={handleAddClick} disabled={!selectedPackage}>
          Add Package to Booking
        </Button>
      </div>
    </div>
  );
};