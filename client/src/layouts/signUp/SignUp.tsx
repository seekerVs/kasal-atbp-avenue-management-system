import React, { useState } from "react";
import { Container, Form, Button, Card, InputGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { Eye, EyeSlash } from "react-bootstrap-icons";

function Sign_up() {
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  return (
    <Container
      fluid
      className="d-flex align-items-center justify-content-center vh-100 bg-light"
    >
      <Card className="p-4 shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <h3 className="text-start fw-semibold mb-4">Sign Up</h3>

        <Form>
          <Form.Group className="mb-3" controlId="formFullname">
            <Form.Control type="text" placeholder="Fullname" />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Control type="email" placeholder="Email" />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPassword">
            <InputGroup>
              <Form.Control
                type={showPassword ? "text" : "password"}
                placeholder="Password"
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeSlash /> : <Eye />}
              </Button>
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formRepeatPassword">
            <InputGroup>
              <Form.Control
                type={showRepeatPassword ? "text" : "password"}
                placeholder="Repeat Password"
              />
              <Button
                variant="outline-secondary"
                onClick={() => setShowRepeatPassword((prev) => !prev)}
              >
                {showRepeatPassword ? <EyeSlash /> : <Eye />}
              </Button>
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3 d-flex align-items-center" controlId="formTerms">
            <Form.Check type="checkbox" className="me-2" />
            <Form.Text>
              I accept <span className="text-primary fw-semibold">Terms of Service</span>
            </Form.Text>
          </Form.Group>

          <Button
            type="submit"
            className="w-100"
            style={{ backgroundColor: "#b30000", borderColor: "#b30000" }}
          >
            Sign Up
          </Button>
        </Form>

        <div className="text-center mt-3">
          <small>
            Have already an account?{" "}
            <Link to="/sign_in" className="text-primary fw-semibold">
              Sign In here
            </Link>
          </small>
        </div>
      </Card>
    </Container>
  );
}

export default Sign_up;
