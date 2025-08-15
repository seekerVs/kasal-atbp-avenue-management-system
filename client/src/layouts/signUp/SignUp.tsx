import React, { useState } from "react";
import { Container, Form, Button, Card, InputGroup, Alert } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeSlash } from "react-bootstrap-icons";
import api from "../../services/api";
import { dispatchAuthChangeEvent } from "../../services/authEvent";

function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

  // --- STEP 1: Add state for all form fields ---
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // --- State for loading and error messages ---
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // --- STEP 2: Create the submit handler ---
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent the default form submission
    setErrorMessage(null); // Clear previous errors

    // --- Basic Validation ---
    if (password !== repeatPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (!termsAccepted) {
      setErrorMessage("You must accept the Terms of Service.");
      return;
    }
    if (password.length < 6) { // Example validation
        setErrorMessage("Password must be at least 6 characters long.");
        return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/auth/signup", {
        name,
        email,
        password,
      });

      // On success, get the token, save it, and navigate
      const { token } = response.data;
      localStorage.setItem("authToken", token);
      dispatchAuthChangeEvent(); 
      
      navigate("/dashboard");

    } catch (error: any) {
      console.error("Sign-up failed:", error);
      // Display the error message from the backend
      setErrorMessage(error.response?.data?.message || "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container
      fluid
      className="d-flex align-items-center justify-content-center vh-100 bg-light"
    >
      <Card className="p-4 shadow-sm" style={{ width: "100%", maxWidth: "400px" }}>
        <h3 className="text-start fw-semibold mb-4">Sign Up</h3>
        
        {/* Display error messages here */}
        {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}

        {/* --- STEP 3: Connect the form and inputs to state --- */}
        <Form onSubmit={handleSignUp}>
          <Form.Group className="mb-3" controlId="formFullname">
            <Form.Control 
              type="text" 
              placeholder="Fullname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Control 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPassword">
            <InputGroup>
              <Form.Control
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button variant="outline-secondary" onClick={() => setShowPassword((prev) => !prev)}>
                {showPassword ? <EyeSlash /> : <Eye />}
              </Button>
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formRepeatPassword">
            <InputGroup>
              <Form.Control
                type={showRepeatPassword ? "text" : "password"}
                placeholder="Repeat Password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                required
              />
              <Button variant="outline-secondary" onClick={() => setShowRepeatPassword((prev) => !prev)}>
                {showRepeatPassword ? <EyeSlash /> : <Eye />}
              </Button>
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3 d-flex align-items-center" controlId="formTerms">
            <Form.Check 
              type="checkbox" 
              className="me-2"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            <Form.Text>
              I accept <span className="text-primary fw-semibold">Terms of Service</span>
            </Form.Text>
          </Form.Group>

          <Button
            type="submit"
            className="w-100"
            style={{ backgroundColor: "#b30000", borderColor: "#b30000" }}
            disabled={isLoading}
          >
            {isLoading ? 'Signing Up...' : 'Sign Up'}
          </Button>
        </Form>

        <div className="text-center mt-3">
          <small>
            Have already an account?{" "}
            <Link to="/signIn" className="text-primary fw-semibold">
              Sign In here
            </Link>
          </small>
        </div>
      </Card>
    </Container>
  );
}

export default SignUp;