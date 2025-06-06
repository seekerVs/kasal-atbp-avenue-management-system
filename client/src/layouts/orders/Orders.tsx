import React from "react";
import SensorDisplay from './SensorDisplay'; // Import the new component
import { Row, Col } from 'react-bootstrap';

function Orders() {
  return (
    <div className="d-flex flex-column py-4">
      <h1 className="mb-4">Your Dashboard</h1>
      <Row>
        <Col md={12}>
          {/* Your existing dashboard content */}
          <p>
            Welcome to your personalized dashboard! Here you can see various
            insights and controls.
          </p>
        </Col>
      </Row>
      <Row className="mt-4">
        <Col md={12}>
          <SensorDisplay /> {/* Add the sensor display component here */}
        </Col>
      </Row>
    </div>
  );
}

export default Orders;
