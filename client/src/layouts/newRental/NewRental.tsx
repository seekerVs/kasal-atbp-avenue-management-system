import { Container, Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { TagFill, BoxSeam, Scissors } from 'react-bootstrap-icons';
import './newRental.css'; // Import the new CSS

function NewRental() {
  const navigate = useNavigate();

  return (
    <Container fluid>
      <div className="text-center mb-5">
        <h2 className="display-6">Create a New Order</h2>
        <p className="lead text-muted">Select the type of order you want to create for the customer.</p>
      </div>
      
      <Row className="justify-content-center g-4">
        {/* Card for Single Item Rent */}
        <Col md={6} lg={4} xl={3}>
          <Card 
            className="h-100 shadow-sm rental-hub-card" 
            onClick={() => navigate('/singleRent')}
          >
            <Card.Body className="p-4">
              <TagFill className="rental-hub-icon" />
              <Card.Title as="h4">Single Item Rent</Card.Title>
              <Card.Text className="text-muted">
                For renting one or more individual, ready-to-wear items.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Card for Package Rent */}
        <Col md={6} lg={4} xl={3}>
          <Card 
            className="h-100 shadow-sm rental-hub-card"
            onClick={() => navigate('/packageRent')}
          >
            <Card.Body className="p-4">
              <BoxSeam className="rental-hub-icon" />
              <Card.Title as="h4">Package Rent</Card.Title>
              <Card.Text className="text-muted">
                For renting a pre-defined package of outfits and items.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>

        {/* Card for Custom Tailoring */}
        <Col md={6} lg={4} xl={3}>
          <Card 
            className="h-100 shadow-sm rental-hub-card"
            onClick={() => navigate('/customRent')}
          >
            <Card.Body className="p-4">
              <Scissors className="rental-hub-icon" />
              <Card.Title as="h4">Custom Tailoring</Card.Title>
              <Card.Text className="text-muted">
                For creating a new, made-to-order outfit for a customer.
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default NewRental;