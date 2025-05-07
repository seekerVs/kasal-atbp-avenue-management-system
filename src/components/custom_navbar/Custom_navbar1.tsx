import { useState } from 'react';
import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './custom_navbar.css';

function Custom_navbar1() {
  const [activeButton, setActiveButton] = useState<'signin' | 'signup' | null>(null);

  const getButtonVariant = (buttonName: string) => {
    return activeButton === buttonName ? 'outline-primary' : 'primary';
  };

  return (
    <Container fluid className="bg-white shadow px-0 w-100">
      <Navbar expand="lg" className="bg-white py-0 custom-container">
        <Container fluid>
          <Navbar.Brand className="brand-text fw-bold impact-font w-auto" href="#">
            KASAL atbp AVENUE
          </Navbar.Brand>

          <div className="d-flex align-items-center ms-auto gap-1 d-lg-none">
            <Navbar.Toggle aria-controls="navbarResponsive" />
          </div>

          <Navbar.Collapse id="navbarResponsive">
            <Nav className="mx-auto gap-4 text-center"
              activeKey="/home"
              onSelect={(selectedKey) => alert(`selected ${selectedKey}`)}
            >
              <Nav.Item>
                <Nav.Link as={Link} to="/">Home</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link href="#services">Services</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link href="#products">Products</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link as={Link} to="/about">About</Nav.Link>
              </Nav.Item>

              <div className="d-flex align-items-center ms-auto gap-3 d-lg-none mx-auto">
                <Button
                  variant={getButtonVariant('signin')}
                  size="sm"
                  onClick={() => setActiveButton('signin')}
                >
                  Sign In
                </Button>
                <Button
                  variant={getButtonVariant('signup')}
                  size="sm"
                  onClick={() => setActiveButton('signup')}
                >
                  Sign Up
                </Button>
              </div>
            </Nav>

            <div className="d-none custom-margin-left1 d-lg-flex gap-3 align-items-center">
              <Button
                variant={getButtonVariant('signin')}
                size="lg"
                onClick={() => setActiveButton('signin')}
              >
                Sign In
              </Button>
              <Button
                variant={getButtonVariant('signup')}
                size="lg"
                onClick={() => setActiveButton('signup')}
              >
                Sign Up
              </Button>
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </Container>
  );
}

export default Custom_navbar1;