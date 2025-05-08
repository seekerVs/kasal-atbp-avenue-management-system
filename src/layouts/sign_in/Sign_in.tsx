import React, { useState } from "react";
import { Container, Form, Button, Card, InputGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { Eye, EyeSlash } from "react-bootstrap-icons";

function Sign_in() {
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  return (
    <Container
      fluid
      className="d-flex align-items-center justify-content-center vh-100 bg-light"
    >
      <Card className="py-5 px-4 shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <h3 className="text-start fw-semibold mb-4">Sign In</h3>

        <Form>
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

          <Button
            type="submit"
            className="w-100"
            style={{ backgroundColor: "#b30000", borderColor: "#b30000" }}
          >
            Sign In
          </Button>
        </Form>

      </Card>
    </Container>
  );
}

export default Sign_in;
