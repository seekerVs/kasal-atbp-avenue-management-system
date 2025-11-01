// client/src/layouts/productViewer/ProductViewer.tsx

import React, { useEffect, useState, useMemo } from "react";
import {
  Row, Col, Button, Image, Spinner, Carousel, Alert, Accordion,
} from "react-bootstrap"; 
import { X } from "react-bootstrap-icons";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { InventoryItem, ItemVariation } from "../../types";
import api from "../../services/api";

import './productViewer.css'; // Import the new CSS file
import { DataPrivacyModal } from "../../components/modals/dataPrivacyModal/DataPrivacyModal";
import { SizeGuideModal } from '../../components/modals/sizeGuideModal/SizeGuideModal';

interface ExtendedItemVariation extends ItemVariation {
  availableStock?: number;
}

const ProductViewer: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [targetDate, setTargetDate] = useState<Date | null>(null);

  const [product, setProduct] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<ExtendedItemVariation | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  useEffect(() => {
  // Initialize targetDate from navigation state when component loads
  if (location.state?.targetDate) {
    setTargetDate(new Date(location.state.targetDate));
  }

  if (!id) {
    setError("No product ID provided.");
    setLoading(false);
    return;
  }

  const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        let response;
        // Conditional API call
        if (location.state?.targetDate) {
          const dateStr = format(new Date(location.state.targetDate), 'yyyy-MM-dd');
          response = await api.get(`/inventory/${id}/availability?date=${dateStr}`);
        } else {
          response = await api.get(`/inventory/${id}`);
        }
        
        const fetchedProduct: InventoryItem = response.data;
        setProduct(fetchedProduct);

        // Find the first variation that is available for the given date, or just in stock
        const firstAvailable = fetchedProduct.variations.find(v => {
          const extendedV = v as ExtendedItemVariation;
          if (extendedV.availableStock !== undefined) {
            return extendedV.availableStock > 0;
          }
          return v.quantity > 0;
        });
        setSelectedVariation(firstAvailable || fetchedProduct.variations[0] || null);

      } catch (err) {
        setError("Product not found or an error occurred.");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, location.state]);

  const availableColors = useMemo(() => {
    if (!product) return [];
    // Use a Map to get unique color objects based on their hex value
    const colorsMap = new Map<string, { name: string; hex: string }>();
    product.variations.forEach(v => {
      if (!colorsMap.has(v.color.hex)) {
        colorsMap.set(v.color.hex, v.color);
      }
    });
    return Array.from(colorsMap.values());
  }, [product]);

  const sizesForSelectedColor = useMemo(() => {
    if (!product || !selectedVariation) return [];
    return product.variations.filter(v => v.color.hex === selectedVariation.color.hex);
  }, [product, selectedVariation]);
  
  const imagesForCarousel = useMemo(() => {
      // Priority 1: Show images from the currently selected variation if they exist.
      if (selectedVariation && selectedVariation.imageUrls && selectedVariation.imageUrls.length > 0) {
          return selectedVariation.imageUrls;
      }
      // Priority 2 (Fallback): If the selected variation has no images, show all unique images from the product.
      if (product) {
          const allUniqueUrls = Array.from(new Set(product.variations.flatMap(v => v.imageUrls)));
          return allUniqueUrls;
      }
      // Priority 3 (Default): Return an empty array if there's no data.
      return [];
  }, [product, selectedVariation]);

  useEffect(() => {
      // When the user selects a new color/size, always reset the carousel to its first image.
      setCarouselIndex(0);
  }, [selectedVariation]);


  const handleColorSelect = (colorObj: { name: string; hex: string; }) => {
    if (!product) return;
    const firstAvailableSizeForColor = product.variations.find(v => v.color.hex === colorObj.hex && v.quantity > 0);
    setSelectedVariation(firstAvailableSizeForColor || product.variations.find(v => v.color.hex === colorObj.hex) || null);
    setQuantity(1);
  };

  const handleSizeSelect = (size: string) => {
    if (!product || !selectedVariation) return;
    const newVariation = product.variations.find(v => v.color.hex === selectedVariation.color.hex && v.size === size);
    setSelectedVariation(newVariation || null);
    setQuantity(1);
  };

  const handleInitiateReservation = () => {
    if (!product || !selectedVariation || selectedVariation.quantity < 1) {
      alert("This variation is out of stock or invalid.");
      return;
    }
    setShowPrivacyModal(true);
  };

  const handleProceedToReservation = () => {
    if (!product || !selectedVariation) return;

    const reservationPayload = {
      type: 'item',
      data: {
        itemId: product._id,
        itemName: product.name,
        variation: {
          color: selectedVariation.color,
          size: selectedVariation.size,
        },
        quantity: quantity,
        price: product.price,
        imageUrl: selectedVariation.imageUrls[0] || undefined,
      }
    };

    // Store the payload in sessionStorage for the next page to pick up
    sessionStorage.setItem('pendingReservationItem', JSON.stringify(reservationPayload));
    
    // Close the modal and navigate
    setShowPrivacyModal(false);
    navigate('/reservations/new', { state: { targetDate: targetDate } }); // <-- This is the updated line
  };

  if (loading) return <div className="text-center py-5"><Spinner /></div>;
  if (error) return <Alert variant="danger" className="m-5 text-center">{error}</Alert>;
  if (!product) return <Alert variant="info" className="m-5 text-center">Product data could not be loaded.</Alert>;

  return (
    <>
      <div className="product-viewer-container position-relative py-4 px-3 px-lg-4">
        <Button variant="link" className="position-absolute top-0 end-0 p-3" onClick={() => navigate(`/products`)} style={{ zIndex: 10 }}>
          <X size={28} color="dark" />
        </Button>
        <Row className="g-4 g-lg-5 justify-content-center">
          {/* --- CORRECTED: Reverted column order to have image on the left and be larger --- */}
          <Col md={6} lg={5} className="d-flex justify-content-center justify-content-lg-end">
            <div className="w-100" style={{ maxWidth: '500px' }}>
              <Carousel 
                activeIndex={carouselIndex} 
                onSelect={(idx) => setCarouselIndex(idx)} 
                interval={imagesForCarousel.length > 1 ? 3000 : null}
                variant="dark"
                className="border rounded" // No longer needs w-100
              >
                {imagesForCarousel.map((img, idx) => (
                  <Carousel.Item key={idx}>
                    <Image 
                        src={img} 
                        fluid 
                        rounded 
                        style={{ aspectRatio: '4/5', objectFit: 'cover' }} 
                    />
                  </Carousel.Item>
                ))}
              </Carousel>
            </div>
          </Col>

          {/* --- CORRECTED: Reverted column order for details --- */}
          <Col md={6} lg={7} className="text-start text-dark">
            <p className="product-category mb-2">{product.category}</p>
            <h2 className="product-title mb-2">{product.name}</h2>
            <p className="lead fs-6 text-muted">{product.description}</p>
            <p className="product-price my-3">₱{product.price.toLocaleString()}</p>
            
            <hr />

            <div className="mb-3">
              <span className="selector-label">
                Color:
                <span className="fw-normal ms-2">
                  {selectedVariation?.color.name}
                </span>
              </span>
              <div className="d-flex gap-2 mt-2">
                {availableColors.map((colorObj) => (
                  <button
                    key={colorObj.hex}
                    className={`color-swatch ${selectedVariation?.color.hex === colorObj.hex ? 'active' : ''}`}
                    style={{ backgroundColor: colorObj.hex }}
                    onClick={() => handleColorSelect(colorObj)}
                    title={colorObj.name}
                  />
                ))}
              </div>
            </div>

            <div className="mb-3">
              <span className="selector-label">Size:</span>
              <div className="d-flex gap-2 flex-wrap">
                {sizesForSelectedColor.map((v) => (
                  <Button key={v.size} className="size-btn" variant={selectedVariation?.size === v.size ? "dark" : "outline-dark"} onClick={() => handleSizeSelect(v.size)} disabled={(targetDate && (v as ExtendedItemVariation).availableStock !== undefined) ? (v as ExtendedItemVariation).availableStock! <= 0 : v.quantity <= 0} size="sm">
                    {v.size}
                  </Button>
                ))}
              </div>
              <Button variant="link" size="sm" className="p-0 text-decoration-underline text-muted" onClick={() => setShowSizeGuide(true)}>
                Size Guide
              </Button>
            </div>

            <div className="mb-3">
              <span className="selector-label">Quantity:</span>
              <div className="d-flex align-items-center gap-2 quantity-selector">
                <Button variant="outline-dark" size="sm" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={!selectedVariation || !targetDate}>-</Button>
                <span className="fw-bold fs-5">{quantity}</span>
                <Button variant="outline-dark" size="sm" onClick={() => setQuantity((q) => Math.min((selectedVariation as ExtendedItemVariation)?.availableStock || 1, q + 1))} disabled={!selectedVariation || !targetDate}>+</Button>
                <small className="ms-2 text-muted">
                  {targetDate && selectedVariation?.availableStock !== undefined && (
                    `${selectedVariation.availableStock} total pieces in stock`
                  )}
                </small>
              </div>
            </div>

            <div className="d-grid gap-2 my-4">
              {!targetDate && (
                <Alert variant="warning" className="text-center small py-2">
                  Please select a Target Reservation Date on the Outfits page to check availability and enable reservation.
                </Alert>
              )}
              <Button 
                className="add-to-booking-btn" 
                onClick={handleInitiateReservation} 
                disabled={!targetDate || !selectedVariation || (selectedVariation.availableStock !== undefined && selectedVariation.availableStock < quantity)}
              >
                Reserve Now
              </Button>
            </div>
            
            <Accordion defaultActiveKey="0" className="product-accordion">
              <Accordion.Item eventKey="0">
                <Accordion.Header>Features & Composition</Accordion.Header>
                <Accordion.Body>
                  {product.features && <ul>{product.features.map((feat, idx) => (<li key={idx}>{feat}</li>))}</ul>}
                  {product.composition && <p>{product.composition.join(', ')}</p>}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          </Col>
        </Row>
      </div>

      <SizeGuideModal show={showSizeGuide} onHide={() => setShowSizeGuide(false)} />

      <DataPrivacyModal
        show={showPrivacyModal}
        onHide={() => setShowPrivacyModal(false)}
        onProceed={handleProceedToReservation}
      />
    </>
  );
};

export default ProductViewer;