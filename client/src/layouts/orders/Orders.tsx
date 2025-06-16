import React, { useState, useEffect } from "react";
import { Row, Col, Nav, Image, Button } from "react-bootstrap"; // Import Button
import { QuestionCircle } from "react-bootstrap-icons";
import Package2 from "../../assets/images/Package2.jpg"; // Placeholder, replace with your actual path

function Orders() {
  // Set "To Process" as the initially active tab, matching the provided image.
  const [activeTab, setActiveTab] = useState<string>("toProcess");

  return (
    // Outer container: Provides padding around the main white content block.
    // Simulates the common light grey background of a web page.
    <div
      className="px-4 px-lg-5 pt-4 pb-4"
      style={{ backgroundColor: "#F8F9FA", minHeight: "100vh" }}
    >
      {/* Main content block: White background, rounded corners, and a subtle shadow. */}
      <div className="bg-white rounded shadow-sm overflow-hidden">
        {/* Navigation Tabs Section */}
        <Nav
          variant="tabs" // Renders tabs with a tab-like appearance
          activeKey={activeTab} // Controls which Nav.Link is active based on state
          onSelect={(selectedKey) => setActiveTab(selectedKey || "")}
        >
          <Nav.Item>
            <Nav.Link eventKey="orders">Orders</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="toProcess">To Process</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="toReturn">To Return</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="completed">Completed</Nav.Link>
          </Nav.Item>
        </Nav>

        {/* Content Area below the tabs */}
        <div className="p-4">
          {/* Customer Information Row */}
          <Row className="mb-3 align-items-center">
            {/* Left column for customer name */}
            <Col xs={6}>
              <p className="mb-0 text-secondary text-start">
                Customer: <b className="text-dark">Juan P. Marquez</b>
              </p>
            </Col>
            {/* Right column for payment status and process status, aligned to end */}
            <Col
              xs={6}
              className="d-flex justify-content-end align-items-center gap-2"
            >
              {/* Payment information and question mark icon */}
              <div
                className="d-flex align-items-center fs-6 fw-lighter border-end pe-1"
                style={{ color: "#479f76" }}
              >
                <p className="mb-0 me-1">Payment first before checkout</p>
                <QuestionCircle size={14} />
              </div>
              {/* "TO PROCESS" status text */}
              <p className="mb-0 fw-medium text-primary">TO PROCESS</p>
            </Col>
          </Row>
          {/* Horizontal divider line */}
          <hr className="my-3" />

          {/* Package Details Section - Item 1 (Package #1) */}
          <Row className="align-items-start mt-4">
            {/* Package Image Column */}
            <Col xs="auto" className="me-3">
              <Image
                src={Package2} // Source of the package image
                fluid // Makes image responsive
                style={{ width: "100px", height: "100px", objectFit: "cover" }} // Fixed size for consistent layout
              />
            </Col>
            {/* Package Text Details Column (takes remaining space) */}
            <Col className="text-start">
              <p className="mb-0 fw-bold" style={{ fontSize: "0.95em" }}>
                Package #1
              </p>
              <p className="mb-1 text-muted" style={{ fontSize: "0.85em" }}>
                Color Motif: Mint Green
              </p>
              <p
                className="mb-1 text-muted"
                style={{ fontSize: "0.8em", lineHeight: "1.3" }}
              >
                Note: Lorem ipsum dolor sit amet, consectetur adipisicing elit,
                sed do eiusmod tempor incididunt ut labore et dolore ma...
              </p>
              <p className="mb-0 text-muted" style={{ fontSize: "0.85em" }}>
                x1
              </p>
            </Col>
            {/* Price Column (aligned to the right) */}
            <Col xs="auto">
              <p
                className="mb-0 fw-bold"
                style={{ color: "#DC3545", fontSize: "1.1em" }}
              >
                ₱6,888
              </p>
            </Col>
          </Row>

          {/* Package Details Section - Item 2 (Relaxed Fit Khaki Green Cargo Jogger) */}
          <Row className="align-items-start mt-4">
            {/* Item Image Column */}
            <Col xs="auto" className="me-3">
              <Image
                src={Package2} // Source of the second item image
                fluid
                style={{ width: "100px", height: "100px", objectFit: "cover" }}
              />
            </Col>
            {/* Item Text Details Column (takes remaining space) */}
            <Col className="text-start">
              <p className="mb-0 fw-bold" style={{ fontSize: "0.95em" }}>
                Relaxed Fit Khaki Green Cargo Jogger
              </p>
              <p className="mb-1 text-muted" style={{ fontSize: "0.85em" }}>
                Functional, versatile, and comfortable utility pants with six
                pockets. That bunch up above your pants.
              </p>
              <p className="mb-1 text-muted" style={{ fontSize: "0.85em" }}>
                Variation: Khaki Green
              </p>
              <p className="mb-0 text-muted" style={{ fontSize: "0.85em" }}>
                Size: S
              </p>
              <p className="mb-0 text-muted" style={{ fontSize: "0.85em" }}>
                x2
              </p>
            </Col>
            {/* Price Column (aligned to the right) */}
            <Col xs="auto">
              <p
                className="mb-0 fw-bold"
                style={{ color: "#DC3545", fontSize: "1.1em" }}
              >
                ₱998
              </p>
            </Col>
          </Row>

          {/* Horizontal divider before total/checkout */}
          <hr className="my-4" /> {/* Increased margin a bit for separation */}

          {/* Order Total Row */}
          <Row className="mb-4">
            <Col className="text-end">
              <p className="mb-0 fw-bold" style={{ fontSize: "1.2em" }}>
                Order Total:{" "}
                <span style={{ color: "#DC3545" }}>₱7,886</span>
              </p>
            </Col>
          </Row>

          {/* Customers info and Checkout Button Row */}
          <Row className="align-items-center">
            {/* Text column */}
            <Col className="text-start">
              <p className="mb-0 text-muted" style={{ fontSize: "0.85em" }}>
                Customers orders information must be correct
              </p>
            </Col>
            {/* Checkout Button column */}
            <Col xs="auto">
              <Button
                variant="danger" // Bootstrap danger variant for red button
                className="px-4 py-2" // Padding for button size
              >
                Checkout
              </Button>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
}

export default Orders;


<<<<<<< HEAD
=======











// import React, { useState, useEffect } from "react";
// import { Row, Col, Nav, Image } from "react-bootstrap";
// import { QuestionCircle } from "react-bootstrap-icons";
// import Package2 from "../../assets/images/Package2.jpg"; // Placeholder, replace with your actual path


// function Orders() {
//   // Set "To Process" as the initially active tab, matching the provided image.
//   const [activeTab, setActiveTab] = useState<string>("toProcess");

//   return (
//     // Outer container: Provides padding around the main white content block.
//     // Simulates the common light grey background of a web page.
//     <div
//       className="px-4 px-lg-5 pt-4 pb-4"
//       style={{ backgroundColor: "#F8F9FA", minHeight: "100vh" }}
//     >
//       {/* Main content block: White background, rounded corners, and a subtle shadow. */}
//       <div className="bg-white rounded shadow-sm overflow-hidden">
//         {/* Navigation Tabs Section */}
//         <Nav
//           variant="tabs" // Renders tabs with a tab-like appearance
//           activeKey={activeTab} // Controls which Nav.Link is active based on state
//           onSelect={(selectedKey) => setActiveTab(selectedKey || "")}
//         >
//           <Nav.Item>
//             <Nav.Link eventKey="orders">Orders</Nav.Link>
//           </Nav.Item>
//           <Nav.Item>
//             <Nav.Link eventKey="toProcess">To Process</Nav.Link>
//           </Nav.Item>
//           <Nav.Item>
//             <Nav.Link eventKey="toReturn">To Return</Nav.Link>
//           </Nav.Item>
//           <Nav.Item>
//             <Nav.Link eventKey="completed">Completed</Nav.Link>
//           </Nav.Item>
//         </Nav>

//         {/* Content Area below the tabs */}
//         <div className="p-4">
//           {/* Customer Information Row */}
//           <Row className="mb-3 align-items-center">
//             {/* Left column for customer name */}
//             <Col xs={6}>
//               <p className="mb-0 text-secondary text-start" >
//                 Customer: <b className="text-dark">Juan P. Marquez</b>
//               </p>
//             </Col>
//             {/* Right column for payment status and process status, aligned to end */}
//             <Col
//               xs={6}
//               className="d-flex justify-content-end align-items-center gap-2"
//             >
//               {/* Payment information and question mark icon */}
//               <div
//                 className="d-flex align-items-center fs-6 fw-lighter border-end pe-1"
//                 style={{ color: "#479f76"}}
//               >
//                 <p className="mb-0 me-1">Payment first before checkout</p>
//                 <QuestionCircle size={14} />
//               </div>
//               {/* "TO PROCESS" status text */}
//               <p
//                 className="mb-0 fw-medium text-primary"
//               >
//                 TO PROCESS
//               </p>
//             </Col>
//           </Row>
//           {/* Horizontal divider line */}
//           <hr className="my-3" />

//           {/* Package Details Section */}
//           <Row className="align-items-start mt-4">
//             {/* Package Image Column */}
//             <Col xs="auto" className="me-3">
//               {" "}
//               {/* xs="auto" makes the column fit its content width */}
//               <Image
//                 src={Package2} // Source of the package image
//                 fluid // Makes image responsive
//                 style={{ width: "100px", height: "100px", objectFit: "cover" }} // Fixed size for consistent layout
//               />
//             </Col>
//             {/* Package Text Details Column (takes remaining space) */}
//             <Col className="text-start">
//               <p className="mb-0 fw-bold" style={{ fontSize: "0.95em" }}>
//                 Package #1
//               </p>
//               <p className="mb-1 text-muted" style={{ fontSize: "0.85em" }}>
//                 Color Motif: Mint Green
//               </p>
//               <p
//                 className="mb-1 text-muted"
//                 style={{ fontSize: "0.8em", lineHeight: "1.3" }}
//               >
//                 Note: Lorem ipsum dolor sit amet, consectetur adipisicing elit,
//                 sed do eiusmod tempor incididunt ut labore et dolore ma...
//               </p>
//               <p className="mb-0 text-muted" style={{ fontSize: "0.85em" }}>
//                 x1
//               </p>
//             </Col>
//             {/* Price Column (aligned to the right) */}
//             <Col xs="auto">
//               <p
//                 className="mb-0 fw-bold"
//                 style={{ color: "#DC3545", fontSize: "1.1em" }}
//               >
//                 ₱6,888
//               </p>
//             </Col>
//           </Row>
//           <Row className="align-items-start mt-4">
//             {/* Package Image Column */}
//             <Col xs="auto" className="me-3">
//               {" "}
//               {/* xs="auto" makes the column fit its content width */}
//               <Image
//                 src={Package2} // Source of the package image
//                 fluid // Makes image responsive
//                 style={{ width: "100px", height: "100px", objectFit: "cover" }} // Fixed size for consistent layout
//               />
//             </Col>
//             {/* Package Text Details Column (takes remaining space) */}
//             <Col className="text-start">
//               <p className="mb-0 fw-bold" style={{ fontSize: "0.95em" }}>
//                 Package #1
//               </p>
//               <p className="mb-1 text-muted" style={{ fontSize: "0.85em" }}>
//                 Color Motif: Mint Green
//               </p>
//               <p
//                 className="mb-1 text-muted"
//                 style={{ fontSize: "0.8em", lineHeight: "1.3" }}
//               >
//                 Note: Lorem ipsum dolor sit amet, consectetur adipisicing elit,
//                 sed do eiusmod tempor incididunt ut labore et dolore ma...
//               </p>
//               <p className="mb-0 text-muted" style={{ fontSize: "0.85em" }}>
//                 x1
//               </p>
//             </Col>
//             {/* Price Column (aligned to the right) */}
//             <Col xs="auto">
//               <p
//                 className="mb-0 fw-bold"
//                 style={{ color: "#DC3545", fontSize: "1.1em" }}
//               >
//                 ₱6,888
//               </p>
//             </Col>
//           </Row>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Orders;
>>>>>>> d613154f3e4e3788a0061f143c415c4b2e95852b
