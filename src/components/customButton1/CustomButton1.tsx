import React from "react";
import { Button } from "react-bootstrap";
import "./customButton1.css";
import { Stars } from "react-bootstrap-icons";

function Custom_button1() {
  return (
    <Button className="custom-button1-style btn-secondary d">
      <Stars size={20} />
      Outfit Recomendation
    </Button>
  );
}

export default Custom_button1;
