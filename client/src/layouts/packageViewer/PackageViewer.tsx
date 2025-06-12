import React, { useState } from "react";
import { Col, Row, Image, Stack, Form, Button } from "react-bootstrap";
import { Package1 } from "../../assets/images";
import { X } from "react-bootstrap-icons";
import { useLocation, useNavigate } from "react-router-dom";

interface PackageItem {
  title: string;
  price: number;
  note?: string;
  items: string[];
}

function PackageViewer() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedPackage = location.state?.packageData as PackageItem | undefined;

  // console.log("PackageViewer: location.state", location.state); // Debugging log
  // console.log("PackageViewer: selectedPackage", selectedPackage); // Debugging log

  // If no package data is found in location.state (e.g., direct navigation or refresh)
  if (!selectedPackage) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center my-5">
        <h2 className="mb-3">No package selected.</h2>
        <p className="mb-4">Please go back to the package selection page to choose an offer.</p>
        <Button variant="danger" onClick={() => navigate('/package')}>
          Go back to Package Selection
        </Button>
      </div>
    );
  }

  const [motif, setMotif] = useState("");
  const [note, setNote] = useState("");


  return (
    <div className="mx-4 mx-lg-5 mt-5 mt-lg-4 position-relative">

      <Button
        variant="link"
        className="position-absolute top-0 end-0 m-0 p-0"
        onClick={() => navigate(-1)}
      >
        <X size={28} color="dark" />
      </Button>
      <Row>
        <Col sm={12} md={6}>
          <div
            className="d-inline-block oveflow-hidden shadow-sm"
            style={{ maxWidth: "60%" }}
          >
            <Image
              src={Package1}
              fluid
              style={{ maxHeight: "600px", objectFit: "cover" }}
            />
          </div>
        </Col>
        <Col sm={12} md={6}>
          <Stack gap={3} className="text-start">
            <div className="gap-5">
              <h3 className="display-8 m-0">{selectedPackage.title}</h3>
              <p className="fst-normal m-0">
                {selectedPackage.note || "A complete package for your special occasion."}
              </p>
            </div>
            <h4 className="fw-semibold">₱ {selectedPackage.price.toLocaleString()}</h4>
            <div className="d-flex flex-column align-items-start">
              <Form className="w-100">
                <Row className="mb-3">
                  <Col md="auto">
                    <Form.Group controlId="colorMotif">
                      <Form.Label>
                        Color Motif <span style={{ color: "red" }}>*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Event color motif"
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3" controlId="note">
                  <Form.Label>Note</Form.Label>
                  <Form.Control
                    as="textarea"
                    placeholder="Add a note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{
                      height: "auto",
                      minWidth: "300px",
                      maxWidth: "100%",
                      maxHeight: "300px",
                      resize: "both",
                      overflow: "auto",
                    }}
                  />
                </Form.Group>
              </Form>
            </div>
            <div className="d-flex flex-wrap gap-3 my-3">
              <Button variant="secondary" size="lg" className="flex-fill">
                Add to cart
              </Button>
              <Button size="lg" className="flex-fill">
                Order now
              </Button>
            </div>
            <div className="mt-4">
              <h5>Inclusions</h5>
              <ul>
                {(selectedPackage.items || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </Stack>
        </Col>
      </Row>
    </div>
  );
}

export default PackageViewer;

