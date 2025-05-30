import React from 'react';
// Make React used to satisfy bundler / test transforms
void React;

import { render, screen, fireEvent } from "@testing-library/react";
import AlertTable from "../components/AlertTable";
import type { Alert } from "../types/alert";
import "@testing-library/jest-dom";


describe("AlertTable", () => {
  const mockAlerts: Alert[] = [
    {
      id: "1",
      timestamp: "2024-06-16T12:00:00Z",
      type: "Type A",
      frameUrl: "http://localhost/frame1.jpg",
      details: "Too many people",
      message: "Anomaly detected",
    },
    {
      id: "2",
      timestamp: "2024-06-16T13:00:00Z",
      type: "Type B",
      frameUrl: "http://localhost/frame2.jpg",
      details: "Car detected",
      message: "Another anomaly detected",
    },
  ];

  it("renders all alert rows", () => {
    render(<AlertTable alerts={mockAlerts} onRowClick={() => {}} />);
    expect(screen.getByText("Type A")).toBeInTheDocument();
    expect(screen.getByText("Type B")).toBeInTheDocument();
    expect(screen.getByText(/Too many people/)).toBeInTheDocument();
    expect(screen.getByText(/Car or bus detected/)).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", () => {
    const mockFn = jest.fn();
    render(<AlertTable alerts={mockAlerts} onRowClick={mockFn} />);
    const row = screen.getByText("Type A").closest("tr");
    fireEvent.click(row!);
    expect(mockFn).toHaveBeenCalledWith(mockAlerts[0]);
  });

    it("renders 'Unknown type' for unexpected alert types", () => {
    const unknownAlert: Alert = {
      id: "3",
      timestamp: "2024-06-16T14:00:00Z",
      type: "Type Z", // 👈 not in descMap
      frameUrl: "http://localhost/frame3.jpg",
      details: "Something strange",
      message: "Unexpected anomaly",
    };

    render(<AlertTable alerts={[unknownAlert]} onRowClick={() => {}} />);
    expect(screen.getByText(/Unknown type/)).toBeInTheDocument();
  });
});
