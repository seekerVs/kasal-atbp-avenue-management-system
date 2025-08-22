import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal, Button, Row, Col, InputGroup, Form, Spinner, Alert, Image, Accordion, ListGroup, Carousel } from 'react-bootstrap';
import { Search, ArrowLeft, Check2 } from 'react-bootstrap-icons';
import { InventoryItem, Package, AssignedItem } from '../../../types';
import api from '../../../services/api';
import PackageCard from '../../packageCard/PackageCard';
import namer from 'color-namer';
import './packageSelectionModal.css';
import { useAlert } from '../../../contexts/AlertContext';

const normalizeHex = (hex: string): string => {
  if (!hex || typeof hex !== 'string') return '';
  let cleanHex = hex.trim().toLowerCase();
  if (!cleanHex.startsWith('#')) {
    cleanHex = `#${cleanHex}`;
  }
  return cleanHex;
};

// The data structure this modal returns on success
export interface PackageSelectionData {
  pkg: Package;
  motifId: string;
}

interface PackageSelectionModalProps {
  show: boolean;
  onHide: () => void;
  onSelect: (selection: PackageSelectionData) => void;
}

export const PackageSelectionModal: React.FC<PackageSelectionModalProps> = ({ show, onHide, onSelect }) => {
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const {addAlert} = useAlert()
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedMotifHex, setSelectedMotifHex] = useState(''); 
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showMotifPreview, setShowMotifPreview] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  useEffect(() => {
    if (show) {
      setLoading(true);
      setError(null);
      // --- MODIFIED: Fetch both packages and inventory in parallel ---
      Promise.all([
        api.get('/packages'),
        api.get('/inventory?limit=1000') // Fetch all inventory for lookups
      ])
      .then(([packagesRes, inventoryRes]) => {
        setAllPackages(packagesRes.data || []);
        setInventory(inventoryRes.data.items || []); // Store inventory
      })
      .catch(() => setError('Could not load packages or inventory data.'))
      .finally(() => setLoading(false));
    } else {
      setSelectedPackage(null);
      setSearchTerm('');
      setSelectedMotifHex('');
    }
  }, [show]);

  const inventoryMap = useMemo(() => new Map(inventory.map(item => [item._id, item])), [inventory]);

  const assignedItemsForDisplay = useMemo(() => {
      // --- STEP 1: Basic validation and find the correct motif ---
      if (!selectedPackage || !selectedMotifHex || inventoryMap.size === 0) {
        return [];
      }
      const normalizedSelectedHex = normalizeHex(selectedMotifHex);
      const motif = selectedPackage.colorMotifs.find(m => normalizeHex(m.motifHex) === normalizedSelectedHex);
      if (!motif) {
        return [];
      }

      // --- STEP 2: Flatten all assigned variations from all roles into one list ---
      // This gives us an array of { itemId, color, size } objects.
      const allAssignedVariations = motif.assignments.flatMap(assignment =>
        assignment.assignedItems.filter((item): item is AssignedItem => item !== null)
      );

      // --- STEP 3: Use a Map to group these variations by the parent item ID ---
      // This ensures we only show each unique item (like "Tuxedo") once in the preview.
      const groupedItems = new Map<string, { _id: string; name: string; imageUrl: string; availableSizes: string[] }>();

      for (const assigned of allAssignedVariations) {
        // If we've already processed this item ID, skip it to avoid duplicates.
        if (groupedItems.has(assigned.itemId)) {
          continue;
        }
        
        const itemDetails = inventoryMap.get(assigned.itemId);
        if (!itemDetails) {
          continue; // Skip if the item isn't found in our inventory map.
        }

        // --- STEP 4: THIS IS THE CRITICAL FIX ---
        // For this item, find all its variations that match its SPECIFICALLY ASSIGNED COLOR
        // from the package definition, not the overall motif color.
        const assignedColorHex = normalizeHex(assigned.color.hex);
        
        const availableSizes = itemDetails.variations
          .filter(v => normalizeHex(v.color.hex) === assignedColorHex && v.quantity > 0)
          .map(v => v.size);

        // Find an image for the preview.
        const displayVariation = itemDetails.variations.find(v => normalizeHex(v.color.hex) === assignedColorHex);

        // Add the processed item to our map.
        groupedItems.set(assigned.itemId, {
        _id: itemDetails._id, // <-- ADD THIS LINE
        name: itemDetails.name,
        imageUrl: displayVariation?.imageUrl || itemDetails.variations[0]?.imageUrl || '',
        availableSizes: availableSizes,
      });
      }

      // --- STEP 5: Convert the map of unique items back to an array for rendering ---
      return Array.from(groupedItems.values());

  }, [selectedPackage, selectedMotifHex, inventoryMap]);

  useEffect(() => {
    if (scrollerRef.current && assignedItemsForDisplay.length > 0) {
      const innerScroller = scrollerRef.current.querySelector('.motif-scroller-inner') as HTMLElement;
      if (innerScroller) {
        const contentWidth = innerScroller.scrollWidth / 2;
        const scrollerVisibleWidth = scrollerRef.current.offsetWidth;
        setIsScrolling(contentWidth > scrollerVisibleWidth);
      }
    } else {
      setIsScrolling(false);
    }
  }, [assignedItemsForDisplay, selectedPackage]);

  const filteredPackages = useMemo(() => {
    if (!searchTerm) return allPackages;
    return allPackages.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, allPackages]);

  const availableMotifs = useMemo(() => {
    if (!selectedPackage) return [];
    
    return selectedPackage.colorMotifs.map(motif => {
      let generatedName = 'Custom Color';
      try {
        const names = namer(motif.motifHex);
        generatedName = names.ntc[0]?.name || names.basic[0]?.name || 'Custom Color';
        generatedName = generatedName.replace(/\b\w/g, char => char.toUpperCase());
      } catch (e) {
        console.warn(`Could not name color for hex: ${motif.motifHex}`, e);
      }
      return {
        _id: motif._id, // <-- ADD THIS LINE
        name: generatedName,
        hex: motif.motifHex,
      };
    });
  }, [selectedPackage]);

  const handleSelectPackage = (pkg: Package) => setSelectedPackage(pkg);
  const handleGoBack = () => { setSelectedPackage(null); setSelectedMotifHex(''); };

  const handleConfirm = () => {
    // The logic here is now simpler, as we just find the selected motif by its ID
    const selectedMotif = availableMotifs.find(m => m.hex === selectedMotifHex);
    
    if (!selectedPackage || !selectedMotif || !selectedMotif._id) {
        addAlert("Please select a valid motif.", "danger");
        return;
    }

    onSelect({ 
      pkg: selectedPackage, 
      motifId: selectedMotif._id, // <-- CHANGE THIS from motifHex
    });
  };

  const renderGridView = () => (
    <>
      <InputGroup className="mb-4">
        <InputGroup.Text><Search /></InputGroup.Text>
        <Form.Control type="search" placeholder="Search for a package..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </InputGroup>
      {loading ? <div className="text-center"><Spinner /></div> : error ? <Alert variant="danger">{error}</Alert> :
        <Row xs={1} sm={2} md={3} className="g-3 package-selection-modal-grid">
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

    const hasPredefinedMotifs = availableMotifs && availableMotifs.length > 0;

    return (
      <>
        <Button variant="link" onClick={handleGoBack} className="mb-3 ps-0">
          <ArrowLeft className="me-2"/>Back to Packages
        </Button>
        
        {/* New Flexbox Layout */}
        <div className="d-md-flex gap-4">
          {/* Image Column */}
          <div className="flex-shrink-0 text-center mb-3 mb-md-0" style={{ flexBasis: '40%' }}>
            <Carousel interval={3000} variant="dark" className='border rounded'>
              {selectedPackage.imageUrls.map((img, idx) => (
                <Carousel.Item key={idx}>
                  <Image src={img} fluid rounded style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
                </Carousel.Item>
              ))}
            </Carousel>
          </div>
          
          {/* Content Column */}
          <div className="flex-grow-1">
            <h3 className="modal-product-title">{selectedPackage.name}</h3>
            <p className="text-muted">{selectedPackage.description}</p>
            <p className="modal-product-price">₱{selectedPackage.price.toLocaleString()}</p>
            <hr/>
            
            <Form.Group className="mb-4">
              <Form.Label className="modal-selector-label">
                {hasPredefinedMotifs ? 'Available Motifs' : 'Color Motif'}
                <span className="text-danger">*</span>
              </Form.Label>
              {hasPredefinedMotifs ? (
                <div className="motif-swatch-container mt-1">
                  {availableMotifs.map((m, index) => (
                    <Button
                      key={index}
                      className={`motif-swatch ${selectedMotifHex === m.hex ? 'active' : ''}`}
                      style={{ backgroundColor: m.hex }}
                      title={m.name}
                      onClick={() => setSelectedMotifHex(m.hex)}
                    />
                  ))}
                </div>
              ) : (
                <Form.Control 
                  className="mt-1"
                  type="text" 
                  placeholder="e.g., Emerald Green & Gold" 
                  value={selectedMotifHex}
                  onChange={e => setSelectedMotifHex(e.target.value)} 
                />
              )}
            </Form.Group>

            {selectedMotifHex && assignedItemsForDisplay.length > 0 && (
              <div className="mt-4 mb-2">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="modal-selector-label mb-0">Motif Item Preview</h6>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-decoration-none"
                    onClick={() => setShowMotifPreview(!showMotifPreview)}
                  >
                    {showMotifPreview ? 'Hide' : 'Show'} Preview
                  </Button>
                </div>

                {/* --- THIS IS THE NEW ANIMATED SCROLLER --- */}
                {showMotifPreview && (
                  <div className="motif-scroller mt-2" ref={scrollerRef}>
                    {/* --- FIXED: Conditionally apply animation class --- */}
                    <div className={`motif-scroller-inner ${isScrolling ? 'animating' : ''}`}>
                      {/* --- FIXED: Always render both sets of items for measurement --- */}
                      {assignedItemsForDisplay.map(item => (
                        <div key={item._id} className="motif-preview-item">
                          <Image src={item.imageUrl} className="motif-preview-img" alt={item.name} />
                          <div className="motif-preview-details">
                            <p className="motif-preview-name" title={item.name}>{item.name}</p>
                            <p className="motif-preview-sizes">Sizes: {item.availableSizes.length > 0 ? item.availableSizes.join(', ') : 'None'}</p>
                          </div>
                        </div>
                      ))}
                      {assignedItemsForDisplay.map(item => (
                        <div key={`${item._id}-clone`} className="motif-preview-item" aria-hidden="true">
                          <Image src={item.imageUrl} className="motif-preview-img" alt={item.name} />
                          <div className="motif-preview-details">
                            <p className="motif-preview-name" title={item.name}>{item.name}</p>
                            <p className="motif-preview-sizes">Sizes: {item.availableSizes.length > 0 ? item.availableSizes.join(', ') : 'None'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="d-grid my-3">
              <Button onClick={handleConfirm} disabled={!selectedMotifHex.trim()}>Add Package to Reservation</Button>
            </div>

            {/* New Accordion for Inclusions */}
            <Accordion defaultActiveKey="0" className="modal-product-accordion">
              <Accordion.Item eventKey="0">
                <Accordion.Header>Package Inclusions</Accordion.Header>
                <Accordion.Body>
                  <ListGroup variant="flush">
                    {selectedPackage.inclusions.map((inclusion) => (
                      <ListGroup.Item key={inclusion._id} className="d-flex border-0 px-0 py-1">
                        <Check2 className="text-success me-2 flex-shrink-0 mt-1" />
                        <span>{`${inclusion.wearerNum} ${inclusion.name}`}</span>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </div>
        </div>
      </>
    );
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered dialogClassName="package-selection-modal">
      <Modal.Header closeButton>
        <Modal.Title>{selectedPackage ? 'Package Details' : 'Select a Package'}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        {selectedPackage ? renderDetailView() : renderGridView()}
      </Modal.Body>
    </Modal>
  );
};