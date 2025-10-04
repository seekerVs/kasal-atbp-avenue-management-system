import { Container, Row, Col } from 'react-bootstrap';
import { CCircle, Facebook, Instagram, Tiktok } from 'react-bootstrap-icons';
import './customFooter.css';

function CustomFooter() {
  return (
    <Container fluid>
        <div className="custom-container">
          <Row className="align-items-center justify-content-between">
          {/* Left section */}
          <Col md="auto" className="d-flex align-items-center gap-2">
              <span className="brand-text text-secondary">KASAL atbp AVENUE</span>
              <CCircle className=""/>
              <span>2025 Kasal atbp Avenue</span>
          </Col>
          {/* Right section */}
          <Col md="auto" className="d-flex align-items-center gap-3">
              <a href="#" className="text-dark fs-5"><Instagram /></a>
              <a href="#" className="text-dark fs-5"><Facebook /></a>
              <a href="#" className="text-dark fs-5"><Tiktok /></a>
          </Col>
          </Row>
        </div>
    </Container>
  )
}

export default CustomFooter