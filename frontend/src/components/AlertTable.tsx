// import React from "react";
import React from 'react';
// Make React used to satisfy bundler / test transforms
void React;

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import type { Alert } from "../types/alert";

interface AlertTableProps {
  alerts: Alert[];
  onRowClick: (alert: Alert) => void;
}

export default function AlertTable({ alerts, onRowClick }: AlertTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>Timestamp</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Message</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {alerts.map((alert, index) => (
            <TableRow
              key={alert.id}
              hover
              onClick={() => onRowClick(alert)}
              style={{ cursor: "pointer" }}
            >
              <TableCell>{index + 1}</TableCell>
              <TableCell>{new Date(alert.timestamp).toLocaleString()}</TableCell>
              <TableCell>{alert.type}</TableCell>
              <TableCell>
                {alert.type
                  .split(',')
                  .map((t) => {
                    const descMap: Record<string, string> = {
                      'Type A': 'Too many people',
                      'Type B': 'Car or bus detected',
                      'Type C': 'High-confidence object (car/bus/bike)',
                    };
                    return `${t.trim()}: ${descMap[t.trim()] || 'Unknown type'}`;
                  })
                  .join(', ')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>

      </Table>
    </TableContainer>
  );
}
