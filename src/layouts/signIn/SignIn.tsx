import React, { useState } from "react";
import { Form, Button, Card, InputGroup } from "react-bootstrap";
import { Eye, EyeSlash } from "react-bootstrap-icons";
import CustomFooter from "../../components/customFooter/CustomFooter";

function Sign_in() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Centered card container */}
      <div className="d-flex flex-grow-1 justify-content-center align-items-center">
        <Card className="py-5 px-4 shadow-sm w-100" style={{ maxWidth: "400px" }}>
          <h3 className="text-start fw-medium mb-4">Sign In</h3>
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

            <Button type="submit" className="w-100">
              Sign In
            </Button>
          </Form>
        </Card>
      </div>

      {/* Footer stays at the bottom */}
      <footer className="text-dark mt-auto py-3">
        <CustomFooter />
      </footer>
    </div>
  );
}

export default Sign_in;
