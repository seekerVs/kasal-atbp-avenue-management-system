import React from "react";
import {
  Container,
  Row,
  Col,
  Image,
  Card,
  Form,
  Button,
} from "react-bootstrap";
import {
  Check2Square,
  Headset,
  BagCheck,
  Collection,
} from "react-bootstrap-icons";
import { Coat_display, Dress_display } from "../../assets/images";
import Custom_footer from "../../components/customFooter/CustomFooter";

function About() {
  return (
    <Container
      fluid
      className="d-flex flex-column justify-content-center p-0 gap-5"
    >
      <div className="bg-dark text-white text-center">
        <Image
          src={Coat_display}
          alt="Hero"
          fluid
          className="w-100"
          style={{ maxHeight: "400px", objectFit: "cover", opacity: 0.7 }}
        />
      </div>
      <div className="w-100">
        <h1 className="fw-bold">Welcome to Kasal atbp Avenue</h1>
        <p className="px-3 px-md-5">
          At Kasal atbp Avenue, we believe that everyone deserves to look
          stunning without the high price tag. We offer premium dress rentals
          with tailored options to ensure the perfect fit for any occasion.
          Whether you need a wedding gown, formal suit, or themed attire, we
          provide high-quality outfits that make a statement. Our mission is to
          make fashion accessible, sustainable, and hassle-free—because great
          style should be available to everyone!
        </p>
      </div>

      <Container fluid className="px-5 my-0">
        <div className="d-flex flex-column flex-md-row w-100">
          {/* Image section - 30% on md+, full on xs */}
          <div
            className="w-100"
            style={{ flexBasis: "100%", maxWidth: "100%", flex: "1 1 60%" }}
          >
            <Image src={Dress_display} alt="Shop Interior" fluid />
          </div>

          {/* Text section - 70% on md+, full on xs */}
          <div
            className="bg-primary text-white p-4 d-flex align-items-center"
            style={{ flexBasis: "100%", maxWidth: "100%", flex: "1 1 40%" }}
          >
            <p className="fw-normal text-start m-0">
              Kasal Atbp Avenue was established with a passion for making
              elegant and stylish fashion accessible to everyone. Specializing
              in dress rentals and custom-tailored outfits, we provide the
              perfect attire for weddings, formal events, and special occasions.
              Our commitment to quality, affordability, and convenience has made
              us a trusted choice for those looking to make a lasting
              impression. From our humble beginnings as a small rental service,
              we have grown into a go-to destination for premium outfit rentals,
              offering a wide range of exquisitely designed pieces for both men
              and women. Whether you need a standalone rental, a complete
              package, or a custom-fitted ensemble, we are here to ensure you
              step out in confidence and style.
            </p>
          </div>
        </div>
      </Container>

      {/* Features Section */}
      <Container className="h-auto px-0 my-0">
        <Row className="gy-4">
          <Col md={3}>
            <div
              className="rounded-circle d-flex"
              style={{
                width: "44px",
                height: "44px",
                margin: "0 auto",
                backgroundColor: "#333333",
              }}
            >
              <Collection size={28} color="white" className="m-auto" />
            </div>
            <h5 className="mt-2">Wide Selection of Styles</h5>
            <p>
              Find the perfect outfit from our curated collection of dresses and
              suits for every occasion.{" "}
            </p>
          </Col>
          <Col md={3}>
            <div
              className="rounded-circle d-flex"
              style={{
                width: "44px",
                height: "44px",
                margin: "0 auto",
                backgroundColor: "#333333",
              }}
            >
              <Check2Square size={28} color="white" className="m-auto" />
            </div>
            <h5 className="mt-2">Perfect Fit Guarantee</h5>
            <p>
              Enjoy tailored dress options and expert fittings to ensure a
              flawless look and fit.
            </p>
          </Col>
          <Col md={3}>
            <div
              className="rounded-circle d-flex"
              style={{
                width: "44px",
                height: "44px",
                margin: "0 auto",
                backgroundColor: "#333333",
              }}
            >
              <BagCheck size={28} color="white" className="m-auto" />
            </div>
            <h5 className="mt-2">Seamless Rental Experience</h5>
            <p>
              Renting is easy and hassle-free with our simple booking and return
              process.
            </p>
          </Col>
          <Col md={3}>
            <div
              className="rounded-circle d-flex"
              style={{
                width: "44px",
                height: "44px",
                margin: "0 auto",
                backgroundColor: "#333333",
              }}
            >
              <Headset size={28} color="white" className="m-auto" />
            </div>
            <h5 className="mt-2">Dedicated Customer Support</h5>
            <p>
              Need help? Our team is here to assist you with styling, sizing,
              and rental inquiries.
            </p>
          </Col>
        </Row>
      </Container>

      {/* Newsletter Section */}
      <div className="d-flex flex-column align-items-sm-end flex-md-row w-100 h-auto p-auto my-0 text-center gap-5 justify-content-center align-items-center">
        <div className="text-start">
          <h2>Stay Updated</h2>
          <p>
            Sign up for our newsletter and be the first to know about new
            arrivals, exclusive offers, and outfit styling tips.
          </p>
        </div>
        <Form className="d-flex justify-content-center align-items-center gap-2 mb-3">
          <Form.Control
            type="email"
            placeholder="Your email"
            style={{ maxWidth: "250px" }}
          />
          <Button variant="danger">Subscribe</Button>
        </Form>
      </div>

      <footer className="bg-white text-dark pb-3">
        <Custom_footer />
      </footer>
    </Container>
  );
}

export default About;
