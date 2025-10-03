// client/src/layouts/packageViewer/PackageViewer.tsx

import React, { useMemo, useState, useEffect, useRef } from "react";
import { Col, Row, Image, Stack, Form, Button, Alert, Carousel, ListGroup, Accordion } from "react-bootstrap";
import { X, Check2 } from "react-bootstrap-icons";
import { useLocation, useNavigate } from "react-router-dom";
import { Package as PackageType, InventoryItem, AssignedItem } from "../../types";
import api from "../../services/api";
import './packageViewer.css';
import namer from 'color-namer';
import { DataPrivacyModal } from "../../components/modals/dataPrivacyModal/DataPrivacyModal";

const normalizeHex = (hex: string): string => {
  if (!hex || typeof hex !== 'string') return '';
  let cleanHex = hex.trim().toLowerCase();
  if (!cleanHex.startsWith('#')) { cleanHex = `#${cleanHex}`; }
  return cleanHex;
};

function PackageViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPackage = location.state?.packageData as PackageType | undefined;

  const [selectedMotifHex, setSelectedMotifHex] = useState("");
  const [error, setError] = useState("");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showMotifPreview, setShowMotifPreview] = useState(true);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);


  useEffect(() => {
    if (selectedPackage) {
      api.get('/inventory?limit=1000')
        .then(inventoryRes => {
          setInventory(inventoryRes.data.items || []);
        })
        .catch(() => console.error('Could not load inventory data for preview.'));
    }
  }, [selectedPackage]);

  // --- ADDED: Memoized maps and display logic from modal ---
  const inventoryMap = useMemo(() => new Map(inventory.map(item => [item._id, item])), [inventory]);

  const assignedItemsForDisplay = useMemo(() => {
    if (!selectedPackage || !selectedMotifHex || inventoryMap.size === 0) return [];
    const normalizedSelectedHex = normalizeHex(selectedMotifHex);
    const motif = selectedPackage.colorMotifs.find(m => normalizeHex(m.motifHex) === normalizedSelectedHex);
    if (!motif) return [];

    const allAssignedVariations = motif.assignments.flatMap(assignment =>
      assignment.assignedItems.filter((item): item is AssignedItem => item !== null)
    );

    const groupedItems = new Map<string, { _id: string; name: string; imageUrl: string; availableSizes: string[] }>();
    for (const assigned of allAssignedVariations) {
      if (groupedItems.has(assigned.itemId)) continue;
      
      const itemDetails = inventoryMap.get(assigned.itemId);
      if (!itemDetails) continue;

      const assignedColorHex = normalizeHex(assigned.color.hex);
      const availableSizes = itemDetails.variations
        .filter(v => normalizeHex(v.color.hex) === assignedColorHex && v.quantity > 0)
        .map(v => v.size);
      const displayVariation = itemDetails.variations.find(v => normalizeHex(v.color.hex) === assignedColorHex);

      groupedItems.set(assigned.itemId, {
        _id: itemDetails._id,
        name: itemDetails.name,
        imageUrl: displayVariation?.imageUrls?.[0] || itemDetails.variations?.[0]?.imageUrls?.[0],
        availableSizes: availableSizes,
      });
    }
    return Array.from(groupedItems.values());
  }, [selectedPackage, selectedMotifHex, inventoryMap]);

  useEffect(() => {
    // We need to check both the ref and the items to be displayed
    if (scrollerRef.current && assignedItemsForDisplay.length > 0) {
      const innerScroller = scrollerRef.current.querySelector('.motif-scroller-inner') as HTMLElement;
      if (innerScroller) {
        // Content width is half the scrollable width (since it's duplicated)
        const contentWidth = innerScroller.scrollWidth / 2;
        const scrollerVisibleWidth = scrollerRef.current.offsetWidth;
        
        // Only set scrolling to true if the content is wider than the visible area
        setIsScrolling(contentWidth > scrollerVisibleWidth);
      }
    } else {
      setIsScrolling(false);
    }
  }, [assignedItemsForDisplay]);

  const availableMotifs = useMemo(() => {
    if (!selectedPackage) return [];
    return selectedPackage.colorMotifs.map(motif => {
      let generatedName = 'Custom Color';
      try {
        const names = namer(motif.motifHex);
        generatedName = names.ntc[0]?.name || names.basic[0]?.name || 'Custom Color';
        generatedName = generatedName.replace(/\b\w/g, char => char.toUpperCase());
      } catch (e) { console.warn(`Could not name color for hex: ${motif.motifHex}`, e); }
      return { name: generatedName, hex: motif.motifHex };
    });
  }, [selectedPackage]);

  const handleReservePackage = () => {
    if (!selectedMotifHex.trim()) {
      setError("Please specify a color motif for your event.");
      return;
    }
    setError("");
    setShowPrivacyModal(true);
  };

  // --- NEW: This is the logic that runs after the user agrees ---
  const handleProceedToReservation = () => {
    if (!selectedPackage) return;
    
    const reservationPayload = {
      type: 'package',
      data: {
        packageId: selectedPackage._id,
        packageName: selectedPackage.name,
        price: selectedPackage.price,
        imageUrl: selectedPackage.imageUrls?.[0],
        motifHex: selectedMotifHex,
        // Pre-populate fulfillment preview
        fulfillmentPreview: selectedPackage.inclusions.flatMap(inc => 
          Array.from({ length: inc.wearerNum }, (_, i) => ({
            role: inc.wearerNum > 1 ? `${inc.name} ${i + 1}` : inc.name,
            isCustom: !!inc.isCustom
          }))
        )
      }
    };

    sessionStorage.setItem('pendingReservationItem', JSON.stringify(reservationPayload));
    setShowPrivacyModal(false);
    navigate('/reservations/new');
  };

  if (!selectedPackage) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center my-5">
        <h2 className="mb-3">No Package Selected</h2>
        <p className="mb-4">Please go back to the package selection page to choose an offer.</p>
        <Button variant="danger" onClick={() => navigate('/packages')}>Go to Packages</Button>
      </div>
    );
  }
  
  const hasPredefinedMotifs = availableMotifs && availableMotifs.length > 0;

  return (
    <>
      <div className="package-viewer-container position-relative py-4 px-3 px-lg-4">
        <Button variant="link" className="position-absolute top-0 end-0 p-3" onClick={() => navigate('/packages')} style={{ zIndex: 10 }}>
          <X size={28} color="dark" />
        </Button>
          <Row className="g-4 g-lg-5 justify-content-center">
            <Col md={6} lg={5} className="d-flex justify-content-center justify-content-lg-end">
              <div className="w-100" style={{ maxWidth: '500px' }}>
                <Carousel interval={3000} variant="dark" className="border rounded">
                  {(selectedPackage.imageUrls && selectedPackage.imageUrls.length > 0) ? (
                    selectedPackage.imageUrls.map((img, idx) => (
                      <Carousel.Item key={idx}>
                        <Image src={img} fluid rounded style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
                      </Carousel.Item>
                    ))
                  ) : (
                    <Carousel.Item>
                      <Image src={'https://placehold.co/800x1000/e9ecef/adb5bd?text=Package+Image'} fluid rounded style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
                    </Carousel.Item>
                  )}
                </Carousel>
              </div>
            </Col>
            <Col md={6} lg={7}>
              <Stack gap={3} className="text-start">
                <div>
                  <h2 className="package-title m-0">{selectedPackage.name}</h2>
                  <p className="lead fs-6 text-muted mt-2">
                    {selectedPackage.description || "A complete package for your special occasion."}
                  </p>
                </div>
                <div>
                  <p className="package-price m-0">₱{selectedPackage.price.toLocaleString()}</p>
                  <hr/>
                </div>
                
                <div>
                  <Form.Group className="mb-3" controlId="colorMotif">
                    <Form.Label className="selector-label">Color Motif <span className="text-danger">*</span></Form.Label>
                    {hasPredefinedMotifs ? (
                      <div className="motif-swatch-container mt-1">
                        {availableMotifs.map((m, index) => (
                          <button
                            key={index}
                            className={`motif-swatch ${selectedMotifHex === m.hex ? 'active' : ''}`}
                            style={{ backgroundColor: m.hex }}
                            title={m.name}
                            onClick={() => setSelectedMotifHex(m.hex)}
                          />
                        ))}
                      </div>
                    ) : (
                      <Form.Control type="text" placeholder="e.g., Champagne & Sage Green" value={selectedMotifHex} onChange={(e) => setSelectedMotifHex(e.target.value)} required />
                    )}
                  </Form.Group>
                  {error && <Alert variant="warning" className="py-2 small">{error}</Alert>}
                </div>
                
                {/* --- ADDED: Motif Item Preview Scroller --- */}
                {selectedMotifHex && assignedItemsForDisplay.length > 0 && (
                  <div className="my-2">
                    <div className="d-flex justify-content-between align-items-center">
                      <h6 className="selector-label mb-0">Motif Item Preview</h6>
                      <Button variant="link" size="sm" className="p-0 text-decoration-none" onClick={() => setShowMotifPreview(!showMotifPreview)}>
                        {showMotifPreview ? 'Hide' : 'Show'} Preview
                      </Button>
                    </div>

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
                
                <div className="d-grid my-2">
                  <Button className="reserve-package-btn" size="lg" onClick={handleReservePackage} disabled={!selectedMotifHex.trim()}>
                    Reserve Now
                  </Button>
                </div>
                
                <Accordion defaultActiveKey="0" className="package-viewer-accordion">
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
              </Stack>
            </Col>
          </Row>
        </div>

      <DataPrivacyModal
        show={showPrivacyModal}
        onHide={() => setShowPrivacyModal(false)}
        onProceed={handleProceedToReservation}
      />
    </>
  );
}

export default PackageViewer;