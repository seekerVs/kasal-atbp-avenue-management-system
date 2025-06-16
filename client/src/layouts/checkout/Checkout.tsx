import React, { useState, useEffect } from "react";
import { Row, Col, Nav, Image, Button, Table, Form } from "react-bootstrap"; // Import Button
import { ChevronLeft, PersonFill, QuestionCircle } from "react-bootstrap-icons";
import Package2 from "../../assets/images/Package2.jpg"; // Placeholder, replace with your actual path
import "./checkout.css";

// Define an interface for your order item structure
interface OrderItem {
  id: string; // Unique ID for React keys
  image: string;
  name: string;
  description?: string; // Optional for products
  details: { label: string; value: string }[]; // For things like Color Motif, Variation, Size
  unitPrice: number;
  quantity: number;
  itemSubtotal: number;
}

function Checkout() {
  const [paymentMethod, setPaymentMethod] = useState<string>(""); // State for payment method
  const [shopDiscount, setShopDiscount] = useState<number>(0); // State for shop discount
  const [gcashReferenceNo, setGcashReferenceNo] = useState<string>(""); // State for Gcash Reference No.
  const [amountTendered, setAmountTendered] = useState<number>(0); // State for Amount Tendered

  // Dummy data for the ordered items, mimicking your image
  const orderItems: OrderItem[] = [
    {
      id: "pkg1",
      image: Package2,
      name: "Package #1",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore ma...",
      details: [{ label: "Color Motif", value: "Mint Green" }],
      unitPrice: 6888,
      quantity: 1,
      itemSubtotal: 6888,
    },
    {
      id: "jogger1",
      image: Package2, // Use your actual image path for the jogger
      name: "Relaxed Fit Khaki Green Cargo Jogger",
      description:
        "Functional, versatile, and comfortable utility pants with six pockets. That bunch up above your pants.",
      details: [
        { label: "Variation", value: "Khaki Green" },
        { label: "Size", value: "S" },
      ],
      unitPrice: 499,
      quantity: 2,
      itemSubtotal: 998,
    },
  ];

  // Calculate the overall order total
  const overallOrderTotal = orderItems.reduce(
    (total, item) => total + item.itemSubtotal,
    0
  );

  // Calculate the overall order subtotal before discount
  const orderSubtotal = orderItems.reduce(
    (total, item) => total + item.itemSubtotal,
    0
  );

  // Calculate total payment after discount
  const totalPayment = orderSubtotal - shopDiscount;
  const cashChange = amountTendered - totalPayment;

  return (
    <div className="d-flex flex-column gap-2 px-4 px-lg-5 pt-4 pb-4">
      <div className="d-flex justify-content-between bg-white rounded shadow-sm p-3">
        <div>
          <div className="d-flex gap-2">
            <ChevronLeft size={24} />
            <p>BACK</p>
          </div>
          <div className="px-2 mt-2 border-start border-primary text-primary border-2 fs-4">
            <p>Checkout</p>
          </div>
        </div>
        <p className="text-primary">TO PROCESS</p>
      </div>

      <div className="d-flex flex-column bg-white rounded-bottom shadow-sm text-start">
        <div className="dashed-line w-100"></div>
        <div className="m-3">
          <div className="d-flex gap-2 text-primary">
            <PersonFill size={24} />
            <p>Customer Information</p>
          </div>
          <p>
            <b>Juan P. Marquez (+63)9125435674</b> Putok Atis, Brgy. Gubat,
            Daet, Camarines Norte <b className="text-primary ms-3">Change</b>
          </p>
        </div>
      </div>

      {/* Main content block: White background, rounded corners, and a subtle shadow. */}
      <div className="bg-white rounded shadow-sm overflow-hidden p-3">
        {/* Package Details Section - Item 1 (Package #1) */}
        <Table responsive borderless className="order-summary-table  bg-white">
          {/* Added custom class for potential future styling */}
          <thead>
            <tr>
              <th className="text-start fw-medium">Products Ordered</th>
              <th className="text-end fs-6">Unit Price</th>
              <th className="text-end fs-6">Quantity</th>
              <th className="text-end fs-6">Item Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item) => (
              <tr key={item.id}>
                <td className="d-flex align-items-start py-3">
                  {/* Use py-3 for consistent padding */}
                  <Image
                    src={item.image}
                    fluid
                    style={{
                      objectFit: "cover",
                      marginRight: "15px", // Spacing between image and text
                      border: "1px solid #dee2e6", // Small border like in image
                    }}
                  />
                  <div className="text-start">
                    <p className="mb-0">{item.name}</p>
                    {item.description && (
                      <p className="mb-1 fs-6 text-muted">{item.description}</p>
                    )}
                    {item.details.map((detail, idx) => (
                      <p key={idx} className="mb-1 fs-6 text-muted">
                        {detail.label}: {detail.value}
                      </p>
                    ))}
                  </div>
                </td>
                <td className="text-end align-middle py-3">
                  {/* Vertical align middle */}
                  <p className="mb-0">
                    {item.unitPrice.toLocaleString("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    })}
                  </p>
                </td>
                <td className="text-end align-middle py-3">
                  {/* Vertical align middle */}
                  <p className="mb-0">{item.quantity}</p>
                </td>
                <td className="text-end align-middle py-3">
                  {/* Vertical align middle */}
                  <p className="mb-0">
                    {item.itemSubtotal.toLocaleString("en-PH", {
                      style: "currency",
                      currency: "PHP",
                    })}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div className="bg-white rounded shadow-sm overflow-hidden p-3">
        <Row className="mb-3 align-items-center">
          <Col xs={6} className="text-start">
            <Form.Label htmlFor="paymentMethod" className="fw-bold mb-0">
              Payment Method
            </Form.Label>
          </Col>
          <Col xs={6}>
            <Form.Group
              controlId="paymentMethod"
              className="d-flex justify-content-end"
            >
              <Form.Select
                value={paymentMethod}
                aria-label="*"
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ maxWidth: "200px" }}
              >
                <option value="">Select Payment</option>
                <option value="Cash">Cash</option>
                <option value="Gcash">GCash</option>
              </Form.Select>
              <span className="text-danger ms-1">*</span>
            </Form.Group>
          </Col>
        </Row>
        {paymentMethod === "Gcash" && (
          <>
            <Row className="mb-sm-4 mb-5 align-items-center">
              <Col xs={6} className="text-start">
                <Form.Label
                  htmlFor="gcashReferenceNo"
                  className="mb-0 fw-medium text-muted"
                >
                  Gcash Reference No.
                </Form.Label>
              </Col>
              <Col xs={6}>
                <Form.Group
                  controlId="gcashReferenceNo"
                  className="d-flex justify-content-end"
                >
                  <Form.Control
                    type="text"
                    placeholder="Ref no."
                    value={gcashReferenceNo}
                    onChange={(e) => setGcashReferenceNo(e.target.value)}
                    style={{ maxWidth: "200px" }}
                  />
                  <span className="text-danger ms-1">*</span>
                </Form.Group>
              </Col>
            </Row>
          </>
        )}
        {/* Show Amount Tendered row ONLY if paymentMethod is "Cash" */}
        {paymentMethod === "Cash" && (
          <>
            <Row className="mb-sm-4 mb-5 align-items-center">
              <Col xs={6} className="text-start">
                <Form.Label
                  htmlFor="amountTendered"
                  className="mb-0 fw-medium text-muted"
                >
                  Amount tendered
                </Form.Label>
              </Col>
              <Col xs={6}>
                <Form.Group
                  controlId="amountTendered"
                  className="d-flex justify-content-end"
                >
                  <Form.Control
                    type="number"
                    placeholder="Enter amount"
                    value={amountTendered === 0 ? "" : amountTendered}
                    onChange={(e) => setAmountTendered(Number(e.target.value))}
                    style={{ maxWidth: "200px" }}
                  />
                  <span className="text-danger ms-1">*</span>
                </Form.Group>
              </Col>
            </Row>
          </>
        )}
        <Row className="mb-4 mt-xl-3 align-items-center">
          <Col xs={6} className="text-start">
            <Form.Label htmlFor="shopDiscount" className="mb-0">
              <span className="fw-bold">Shop Discount</span> (in Peso)
            </Form.Label>
          </Col>
          <Col xs={6}>
            <Form.Group
              controlId="shopDiscount"
              className="d-flex justify-content-end me-2"
            >
              <Form.Control
                type="number"
                placeholder="Enter discount"
                value={shopDiscount === 0 ? "" : shopDiscount} // Show empty string if 0, for placeholder
                onChange={(e) => setShopDiscount(Number(e.target.value))}
                style={{ maxWidth: "200px" }} // Constrain width to match image
              />
            </Form.Group>
          </Col>
        </Row>
        <hr className="my-4" /> {/* Horizontal line after discount input */}
        <div className="d-flex flex-wrap align-items-end flex-column">
          <div className="text-nowrap text-start">
            {/* Order Summary */}
            <div className="d-flex flex-wrap justify-content-between mb-2">
              <p className="mb-0 text-muted me-5">Order Subtotal</p>
              <div className="text-end">
                <p className="mb-0">
                  {orderSubtotal.toLocaleString("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  })}
                </p>
              </div>
            </div>
            {/* Shop Discount */}
            <div className="d-flex flex-wrap justify-content-between mb-2">
              <p className="mb-0 text-muted">Shop Discount</p>
              <div className="text-end">
                <p className="mb-0">
                  {shopDiscount.toLocaleString("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  })}
                </p>
              </div>
            </div>

            {/* Total Payment */}
            <div className="d-flex flex-wrap justify-content-between mb-2">
              <p className="mb-0 fw-medium">Total Payment</p>
              <div className="text-end">
                <p className="mb-0 text-primary fs-4">
                  {totalPayment.toLocaleString("en-PH", {
                    style: "currency",
                    currency: "PHP",
                  })}
                </p>
              </div>
            </div>
            <hr className="my-1" />

            {paymentMethod === "Cash" && (
              <>
                <Row className="text-end fs-6 text-muted">
                  <Col>
                    <p className="mb-0 mx-auto">CASH</p>
                  </Col>
                  <Col>
                    <p className="mb-0">
                      {amountTendered.toLocaleString("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      })}
                    </p>
                  </Col>
                </Row>
                <Row className="text-end fs-6 text-muted">
                  <Col>
                    <p className="mb-0 mx-auto">CHANGE</p>
                  </Col>
                  <Col>
                    <p className="mb-0">
                      {cashChange.toLocaleString("en-PH", {
                        style: "currency",
                        currency: "PHP",
                      })}
                    </p>
                  </Col>
                </Row>
              </>
            )}
          </div>
        </div>
        {/* Customers info and Checkout Button Row (Existing, just moved below new summary) */}
        <Row className="align-items-center mt-4">
          <Col className="text-start">
            <p className="mb-0 text-muted" style={{ fontSize: "0.85em" }}>
              Customer orders information must be correct
            </p>
          </Col>
          <Col xs="auto">
            <Button className="px-4 py-2">Checkout</Button>
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default Checkout;
