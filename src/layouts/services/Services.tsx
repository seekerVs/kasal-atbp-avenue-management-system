import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { Standalone, Tailoring_252x168, Wedding_252x168 } from '../../assets/images';

function Services() {
  return (
    <Container className="py-5 text-center">
      <h2 className="display-4 fw-semibold">Services</h2>
      <p className="text-muted mx-auto mb-5" style={{ maxWidth: '700px' }}>
        Find the perfect outfit at the right price. Choose from flexible rental options,
        whether you need a single piece or a complete package. No hidden fees—just stylish,
        high-quality attire for every occasion.
      </p>

      <Row className="g-4 justify-content-center">
        {/* Standalone Card */}
        <Col xs={12} md={6} lg={4}>
          <Card className="h-100 border-light shadow-sm rounded-4">
            <Card.Body className="text-center">
              <Card.Title className="fw-bold mb-3">Standalone</Card.Title>
              <Card.Img
                variant="top"
                src={Standalone}
                alt="Standalone Service"
                style={{ objectFit: 'cover', height: '150px', width: '100%', marginBottom: '1rem' }}
              />
              <Card.Text>
                Rent a single outfit<br />
                Various styles available<br />
                Perfect for one-time events<br />
                Standard fitting options
              </Card.Text>
              <Button variant="danger" className="mt-3">Order now</Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Package Card */}
        <Col xs={12} md={6} lg={4}>
          <Card className="h-100 border-light shadow-sm rounded-4">
            <Card.Body className="text-center">
              <Card.Title className="fw-bold mb-3">Package</Card.Title>
              <Card.Img
                variant="top"
                src={Wedding_252x168}
                alt="Package Service"
                style={{ objectFit: 'cover', height: '150px', width: '100%', marginBottom: '1rem' }}
              />
              <Card.Text>
                Outfit + Accessories combo<br />
                Tailored for weddings & events<br />
                Discounted bundle pricing<br />
                Multiple size options
              </Card.Text>
              <Button variant="danger" className="mt-3">Order now</Button>
            </Card.Body>
          </Card>
        </Col>

        {/* Custom Card */}
        <Col xs={12} md={6} lg={4}>
          <Card className="h-100 border-light shadow-sm rounded-4">
            <Card.Body className="text-center">
              <Card.Title className="fw-bold mb-3">Custom</Card.Title>
              <Card.Img
                variant="top"
                src={Tailoring_252x168}
                alt="Custom Service"
                style={{ objectFit: 'cover', height: '150px', width: '100%', marginBottom: '1rem' }}
              />
              <Card.Text>
                Tailored outfit design<br />
                Personalized measurements<br />
                Premium fabric choices<br />
                Consultation included
              </Card.Text>
              <Button variant="danger" className="mt-3">Order now</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Services;
