import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Row, Col, InputGroup, Form, Spinner, Alert, Image } from 'react-bootstrap';
import { Search, ArrowLeft } from 'react-bootstrap-icons';
import { Package } from '../../../types';
import api from '../../../services/api';
import PackageCard from '../../packageCard/PackageCard';
import './packageSelectionModal.css';

// The data structure this modal returns on success
export interface PackageSelectionData {
  pkg: Package;
  motif: string;
}

interface PackageSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelect: (selection: PackageSelectionData) => void;
}

export const PackageSelectionModal: React.FC<PackageSelectionModalProps> = ({ show, onHide, onSelect }) => {
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [motif, setMotif] = useState('');

  useEffect(() => {
    if (show) {
      setLoading(true);
      setError(null);
      api.get('/packages')
        .then(res => setAllPackages(res.data || []))
        .catch(() => setError('Could not load packages.'))
        .finally(() => setLoading(false));
    } else {
      // Reset state when modal is hidden
      setSelectedPackage(null);
      setSearchTerm('');
      setMotif('');
    }
  }, [show]);

  const filteredPackages = useMemo(() => {
    if (!searchTerm) return allPackages;
    return allPackages.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, allPackages]);

  const handleSelectPackage = (pkg: Package) => setSelectedPackage(pkg);
  const handleGoBack = () => setSelectedPackage(null);

  const handleConfirm = () => {
    if (!selectedPackage) return;
    if (!motif.trim()) {
      alert('Please provide a color motif.');
      return;
    }
    onSelect({ pkg: selectedPackage, motif });
    onHide();
  };

  const renderGridView = () => (
    <>
      <InputGroup className="mb-4">
        <InputGroup.Text><Search /></InputGroup.Text>
        <Form.Control type="search" placeholder="Search for a package..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </InputGroup>
      {loading ? <div className="text-center"><Spinner /></div> : error ? <Alert variant="danger">{error}</Alert> :
        <Row xs={1} sm={2} md={3} className="g-3 package-selection-modal-grid" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {filteredPackages.map(pkg => (
            <Col key={pkg._id}>
              <div onClick={() => handleSelectPackage(pkg)}>
                <PackageCard title={pkg.name} price={pkg.price} items={pkg.inclusions} imageUrls={pkg.imageUrls} />
              </div>
            </Col>
          ))}
        </Row>
      }
    </>
  );

  const renderDetailView = () => {
    if (!selectedPackage) return null;
    return (
      <>
        <Button variant="link" onClick={handleGoBack} className="mb-3 ps-0"><ArrowLeft className="me-2"/>Back to Packages</Button>
        <Row>
          <Col md={5}>
            <Image src={selectedPackage.imageUrls[0]} alt={selectedPackage.name} className="package-detail-view-img" />
          </Col>
          <Col md={7}>
            <h3>{selectedPackage.name}</h3>
            <p className="text-danger h4 fw-bold">₱{selectedPackage.price.toLocaleString()}</p>
            <p className="text-muted small">{selectedPackage.description}</p>
            <Form.Group className="my-3">
              <Form.Label className="fw-bold">Color Motif <span className="text-danger">*</span></Form.Label>
              <Form.Control type="text" placeholder="e.g., Emerald Green & Gold" value={motif} onChange={e => setMotif(e.target.value)} />
            </Form.Group>
            <div className="d-grid">
              <Button onClick={handleConfirm} disabled={!motif.trim()}>Add Package to Reservation</Button>
            </div>
          </Col>
        </Row>
      </>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>{selectedPackage ? 'Package Details' : 'Select a Package'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {selectedPackage ? renderDetailView() : renderGridView()}
      </Modal.Body>
    </Modal>
  );
};