// client/src/layouts/packageViewer/PackageViewer.tsx

import React from "react";
import { Col, Row, Image, Stack, Form, Button, Alert, Carousel } from "react-bootstrap";
import { X } from "react-bootstrap-icons";
import { useLocation, useNavigate } from "react-router-dom";
import { Package as PackageType } from "../../types";
import CustomFooter from "../../components/customFooter/CustomFooter";
import './packageViewer.css';

function PackageViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPackage = location.state?.packageData as PackageType | undefined;

  const [motif, setMotif] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState("");

  const handleReservePackage = () => {
    if (!motif.trim()) {
      setError("Please specify a color motif for your event.");
      return;
    }
    setError("");

    // Create a new object that includes the user's input
    const packageWithDetails = {
      ...selectedPackage,
      motifName: motif,
      notes: note,
    };

    navigate('/reservations/new', { state: { preselectedPackage: packageWithDetails } });
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

  return (
    <>
      <div className="package-viewer-container mt-3 mt-lg-4 mx-4 mx-lg-5 position-relative">
        <Button variant="link" className="position-absolute top-0 end-0 m-0 p-0 mt-3" onClick={() => navigate('/packages')} style={{ zIndex: 10 }}>
          <X size={28} color="dark" />
        </Button>
        <Row className="g-4 g-lg-5">
          <Col md={6} lg={7} className="d-flex justify-content-md-end">
              <Carousel interval={3000} className="w-100" style={{ maxWidth: '500px' }}>
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
          </Col>
          <Col md={6} lg={5}>
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
                  <Form.Label className="fw-bold">Color Motif <span className="text-danger">*</span></Form.Label>
                  <Form.Control type="text" placeholder="e.g., Champagne & Sage Green" value={motif} onChange={(e) => setMotif(e.target.value)} required />
                </Form.Group>
                <Form.Group className="mb-3" controlId="note">
                  <Form.Label className="fw-bold">Notes (Optional)</Form.Label>
                  <Form.Control as="textarea" placeholder="Any special requests or details" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                </Form.Group>
                {error && <Alert variant="warning" className="py-2 small">{error}</Alert>}
              </div>
              <div className="d-grid my-2">
                <Button className="reserve-package-btn" size="lg" onClick={handleReservePackage} disabled={!motif.trim()}>
                  Reserve this Package
                </Button>
              </div>
              <div className="mt-2">
                <h5 className="fw-bold">Inclusions</h5>
                <ul className="inclusions-list">
                  {(selectedPackage.inclusions || []).map((inclusion) => (
                    <li key={inclusion._id}>{`${inclusion.wearerNum} ${inclusion.name}`}</li>
                  ))}
                </ul>
              </div>
            </Stack>
          </Col>
        </Row>
      </div>
      <footer className="text-dark py-3 mt-5">
        <CustomFooter />
      </footer>
    </>
  );
}

export default PackageViewer;