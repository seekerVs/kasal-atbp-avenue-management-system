import { Container, Row, Col, Card, Button } from "react-bootstrap";
import {
  Standalone,
  Tailoring_252x168,
  Wedding_252x168,
} from "../../assets/images";
import Custom_footer from "../../components/customFooter/CustomFooter";
import { useNavigate } from "react-router-dom";

function Services() {
  const navigate = useNavigate();

  return (
    <div className="d-flex flex-column justify-content-center pt-4 mx-4 mx-lg-5">
      <h1 className="fw-medium display-5 mb-3">Services</h1>
      <p className="text-muted mx-auto mb-3" style={{ maxWidth: "700px" }}>
        Find the perfect outfit at the right price. Choose from flexible rental
        options, whether you need a single piece or a complete package. No
        hidden fees just stylish, high-quality attire for every occasion.
      </p>

      <Container className="p-0 bg-transparent mx-auto my-0 w-auto h-auto">
        <Row className="g-4 justify-content-center">
          {/* Standalone Card */}
          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 border-light shadow-sm">
              <Card.Header className="fw-bold">Single</Card.Header>
              <Card.Body className="d-flex flex-column align-items-center">
                <Card.Img
                  variant="top"
                  src={Standalone}
                  alt="Single rental Service"
                  style={{
                    objectFit: "cover",
                    height: "150px",
                    width: "100%",
                    marginBottom: "1rem",
                  }}
                />
                <Card.Text>
                  Rent a single outfit
                  <br />
                  Various styles available
                  <br />
                  Perfect for one-time events
                  <br />
                  Standard fitting options
                </Card.Text>
                <Button
                  variant="primary"
                  className="mt-auto"
                  onClick={() => navigate("/products")}
                >
                  Order now
                </Button>
              </Card.Body>
            </Card>
          </Col>
          {/* Package Card */}
          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 border-light shadow-sm">
              <Card.Header className="fw-bold">Package</Card.Header>
              <Card.Body className="d-flex flex-column align-items-center">
                <Card.Img
                  variant="top"
                  src={Wedding_252x168}
                  alt="Package Service"
                  style={{
                    objectFit: "cover",
                    height: "150px",
                    width: "100%",
                    marginBottom: "1rem",
                  }}
                />
                <Card.Text>
                  Outfit + Accessories combo
                  <br />
                  Tailored for weddings & events
                  <br />
                  Discounted bundle pricing
                  <br />
                  Multiple size options
                </Card.Text>
                <Button
                  variant="primary"
                  className="mt-auto"
                  onClick={() => navigate("/package")}
                >
                  Order now
                </Button>
              </Card.Body>
            </Card>
          </Col>
          {/* Custom Card */}
          <Col xs={12} md={6} lg={4}>
            <Card className="h-100 border-light shadow-sm">
              <Card.Header className="fw-bold">Custom</Card.Header>
              <Card.Body className="d-flex flex-column align-items-center">
                <Card.Img
                  variant="top"
                  src={Tailoring_252x168}
                  alt="Custom Service"
                  style={{
                    objectFit: "cover",
                    height: "150px",
                    width: "100%",
                    marginBottom: "1rem",
                  }}
                />
                <Card.Text>
                  Tailored outfit design
                  <br />
                  Personalized measurements
                  <br />
                  Premium fabric choices
                  <br />
                  Consultation included
                </Card.Text>
                <Button
                  variant="primary"
                  className="mt-auto"
                  onClick={() => navigate("/customTailoring")}
                >
                  Order now
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <hr className="mx-auto" style={{ width: "900px" }} />

      <footer className="text-dark py-3">
        <Custom_footer />
      </footer>
    </div>
  );
}

export default Services;
