import React from 'react';
// Make React used to satisfy bundler / test transforms
void React;

import { render, screen, fireEvent } from "@testing-library/react";
import AlertModal from "../components/AlertModal";
import type { Alert } from "../types/alert";
import "@testing-library/jest-dom";

describe("AlertModal", () => {
  const mockAlert: Alert = {
    id: "1",
    timestamp: "2024-06-16T12:00:00Z",
    type: "Type A,Type C",
    frameUrl: "http://localhost/test-frame.jpg",
    details: "Too many people detected",
    message: "Multiple types detected",
  };

  it("renders alert data correctly when open", () => {
    render(<AlertModal alert={mockAlert} open={true} onClose={() => {}} />);
    expect(screen.getByText("Type A,Type C")).toBeInTheDocument();
    expect(screen.getByText(/Type A: Too many people/)).toBeInTheDocument();
    expect(screen.getByText(/High-confidence object/)).toBeInTheDocument();
    expect(screen.getByText(/Timestamp:/)).toBeInTheDocument();
    expect(screen.getByAltText("frame")).toBeInTheDocument();
  });

  it("does not render when alert is null", () => {
    const { container } = render(<AlertModal alert={null} open={true} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("calls onClose when Close button is clicked", () => {
    const handleClose = jest.fn();
    render(<AlertModal alert={mockAlert} open={true} onClose={handleClose} />);
    const closeBtn = screen.getByText("Close");
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it("renders fallback for unknown anomaly type", () => {
  const alert: Alert = {
    id: "2",
    timestamp: "2024-06-16T15:00:00Z",
    type: "Type X", // Not in descMap
    frameUrl: "http://localhost/unknown.jpg",
    details: "Unrecognized object",
    message: "Something new",
  };

  render(<AlertModal alert={alert} open={true} onClose={() => {}} />);
  expect(screen.getByText(/Unknown type/)).toBeInTheDocument();
});

});
