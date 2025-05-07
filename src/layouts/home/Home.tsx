import React from 'react';
import { Container, Image, Button, Form, CardGroup, Card } from 'react-bootstrap';
import { Store_1, Wedding_attire, Formal_men } from '../../assets/images';
import { CartCheck, PiggyBank, LightningCharge, Award } from 'react-bootstrap-icons';
import Custom_button1 from '../../components/custom_button1/Custom_button1';
import './home.css';

function Home() {
  return (
    <Container fluid className="p-0">
      {/* Hero Section */}
      <div className="d-flex flex-column mb-lg-3 mb-1">
        <div className="store1-style position-relative overflow-hidden">
          <Image
            src={Store_1}
            alt="Store image"
            className="w-100 object-fit-cover"
          />
          <div className="w-auto h-auto position-absolute top-50 gap-4 start-50 translate-middle d-flex flex-column align-items-center">
            <div className="bg-black bg-opacity-25 p-3 rounded-1 text-center">
              <h2 className="fw-bold text-white">Find your perfect outfit</h2>
              <Form className="search-style d-flex gap-3">
                <Form.Group controlId="formBasicEmail" className="mb-0 flex-grow-1">
                  <Form.Control
                    type="text"
                    placeholder="Look for dress color, type, or name"
                    size="sm"
                  />
                </Form.Group>
                <Button variant="primary" size="sm" type="submit">
                  Search
                </Button>
              </Form>
            </div>
            <Custom_button1 />
          </div>
        </div>
      </div>

      {/* Feature Icons */}
        <div className="container d-block" style={{ maxWidth: '900px'}}>
          <div className="mw-100 mx-auto">
            <div className="d-flex flex-column flex-md-row justify-content-center gap-4">
              <div className="mb-4 mb-md-0">
                <CartCheck className="display-4 text-danger" />
                <h5 className="fw-bold mt-2">All-in-one</h5>
                <p>Seamless dress rental and custom tailoring, all in one platform</p>
              </div>
              <div className="mb-4 mb-md-0">
                <PiggyBank className="display-4 text-danger" />
                <h5 className="fw-bold mt-2">Affordable</h5>
                <p>Elegant dresses at rental prices, plus custom fits without the high cost</p>
              </div>
              <div className="mb-4 mb-md-0">
                <LightningCharge className="display-4 text-danger" />
                <h5 className="fw-bold mt-2">Fast Service</h5>
                <p>Quick rentals, instant measurements, and tailored dresses delivered on time</p>
              </div>
              <div className="mb-4 mb-md-0">
                <Award className="display-4 text-danger" />
                <h5 className="fw-bold mt-2">Trusted Quality</h5>
                <p>Expert craftsmanship and premium fabrics for the perfect fit every time</p>
              </div>
            </div>
          </div>

          <hr />

          {/* Vertical Card Layout */}
          <CardGroup className="d-flex flex-row justify-content-center gap-4">
            <Card className="w-100" style={{ maxWidth: '300px' }}>
              <Card.Img variant="top" src={Formal_men} alt="Standalone" />
              <Card.Body className="text-start">
                <Card.Title className="fw-bold">Standalone</Card.Title>
                <Card.Text>
                  Rent a dress for any occasion. Flexible and hassle-free
                </Card.Text>
                <Button variant="danger">View</Button>
              </Card.Body>
            </Card>

            <Card className="w-100" style={{ maxWidth: '300px' }}>
              <Card.Img variant="top" src={Wedding_attire} alt="Package" />
              <Card.Body className="text-start">
                <Card.Title className="fw-bold">Package</Card.Title>
                <Card.Text>
                  Get a complete dress set for any events such as wedding, party, and more
                </Card.Text>
                <Button variant="danger">View</Button>
              </Card.Body>
            </Card>
          </CardGroup>

        </div>

    </Container>
  );
}

export default Home;
