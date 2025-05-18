import React, { useState } from "react";
import { Col, Row, Image, Stack, Form, Button } from "react-bootstrap";
import { Tailoring_424x636 } from "../../assets/images";
import { X } from "react-bootstrap-icons";

function CustomTailoring() {
  const [motif, setMotif] = useState("");
  const [garment, setGarment] = useState("");
  const [purchase, setPurchase] = useState(false);
  const [rentBack, setRentBack] = useState(false);
  const [note, setNote] = useState("");
  const [price, setPrice] = useState("");

  return (
    <div className="mx-4 mx-lg-5 mt-3 mt-lg-4 position-relative">
      <Button
        variant="link"
        className="position-absolute top-0 end-0 m-0 p-2 pe-0"
        onClick={() => window.history.back()}
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
              src={Tailoring_424x636}
              fluid
              style={{ maxHeight: "600px", objectFit: "cover" }}
            />
          </div>
        </Col>
        <Col sm={12} md={6}>
          <Stack gap={3} className="text-start">
            <div className="gap-5">
              <h3 className="display-8 m-0">Custom Tailored Outfit</h3>
              <p className="fst-normal m-0">
                Tailored outfit design with personalized measurements and
                premium fabric choices
              </p>
              <p className="fst-italic m-0">(price may vary)</p>
            </div>
            <div className="d-flex flex-column align-items-start">
              {/* <div> */}
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
                  <Col md="auto">
                    <Form.Group controlId="garmentType">
                      <Form.Label>
                        Garment Type <span style={{ color: "red" }}>*</span>
                      </Form.Label>
                      <Form.Select
                        value={garment}
                        onChange={(e) => setGarment(e.target.value)}
                      >
                        <option value="" disabled hidden>
                          Select a garment type
                        </option>
                        <option value="gown">Gown</option>
                        <option value="barong">Barong</option>
                        <option value="suit">Suit</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Form.Group className="mb-3" controlId="serviceType">
                  <Form.Label>
                    Tailoring Service Type
                    <span style={{ color: "red" }}>*</span>
                  </Form.Label>
                  <div className="d-flex gap-3">
                    <Form.Check
                      type="radio"
                      label="Tailored for Purchase"
                      name="tailoringService"
                      checked={purchase}
                      onChange={() => {
                        setPurchase(true);
                        setRentBack(false);
                      }}
                    />
                    <Form.Check
                      type="radio"
                      label="Tailored for Rent-Back"
                      name="tailoringService"
                      checked={rentBack}
                      onChange={() => {
                        setRentBack(true);
                        setPurchase(false);
                      }}
                    />
                  </div>
                </Form.Group>

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

                <Button className="mb-3">Get Sizes</Button>

                <Form.Group controlId="price">
                  <Form.Label>
                    Price <span style={{ color: "red" }}>*</span>
                  </Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Enter price in pesos"
                    value={price}
                    required
                    onChange={(e) => setPrice(e.target.value)}
                    style={{ width: "200px" }}
                  />
                </Form.Group>
              </Form>
              {/* </div> */}
            </div>
            <div className="d-flex flex-wrap gap-3 my-3">
              <Button variant="secondary" size="lg" className="flex-fill">
                Add to cart
              </Button>
              <Button size="lg" className="flex-fill">
                Order now
              </Button>
            </div>
          </Stack>
        </Col>
      </Row>
    </div>
  );
}

export default CustomTailoring;
