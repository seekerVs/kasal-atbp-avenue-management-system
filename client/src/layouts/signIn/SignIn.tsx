import React, { useState } from "react";
import { Form, Button, Card, InputGroup, Alert } from "react-bootstrap"; // Import Alert for error messages
import { Eye, EyeSlash } from "react-bootstrap-icons";
import CustomFooter from "../../components/customFooter/CustomFooter"; // Assuming this path is correct
import { useNavigate } from "react-router-dom";
import axios from "axios"; // Import axios

interface SignInProps {
  setNavbarType: (type: "main" | "alt") => void;
}

function SignIn({ setNavbarType }: SignInProps) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false); // State for loading
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // State for error messages

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); // Set loading to true when form is submitted
    setErrorMessage(null); // Clear any previous error messages

    try {
      const response = await axios.post("http://localhost:3001/api/auth/login", {
        email,
        password,
      });

      // Assuming your backend returns a token on successful login
      const { token } = response.data;

      // Store the token (e.g., in localStorage)
      localStorage.setItem("authToken", token); // Important for subsequent authenticated requests

      console.log("Signed in successfully!");

      // Update the navbar type and navigate to dashboard
      setNavbarType("alt");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Sign-in failed:", error);
      if (error.response) {
        // This line will now pick up the more specific message from the backend!
        setErrorMessage(
          error.response.data.message ||
            "An error occurred during sign-in. Please try again."
        );
      } else if (error.request) {
        setErrorMessage(
          "No response from server. Please check your internet connection or try again later."
        );
      } else {
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Centered card container */}
      <div className="d-flex flex-grow-1 justify-content-center align-items-center">
        <Card
          className="py-5 px-4 shadow-sm w-100"
          style={{ maxWidth: "400px" }}
        >
          <h3 className="text-start fw-medium mb-4">Sign In</h3>

          {/* Display error message if present */}
          {errorMessage && (
            <Alert variant="danger" className="mb-3">
              {errorMessage}
            </Alert>
          )}

          <Form onSubmit={handleSignIn}>
            <Form.Group className="mb-3" controlId="formEmail">
              <Form.Control
                type="email"
                placeholder="Email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading} // Disable input while loading
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="formPassword">
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading} // Disable input while loading
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLoading} // Disable button while loading
                >
                  {showPassword ? <EyeSlash /> : <Eye />}
                </Button>
              </InputGroup>
            </Form.Group>

            <Button
              type="submit"
              className="w-100"
              variant="primary"
              disabled={isLoading} // Disable the button while loading
            >
              {isLoading ? "Signing In..." : "Sign In"}{" "}
              {/* Change button text during loading */}
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

export default SignIn;
