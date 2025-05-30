import React from 'react';
// Make React used to satisfy bundler / test transforms
void React;

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import type { Alert } from "../types/alert";

interface AlertModalProps {
  alert: Alert | null;
  open: boolean;
  onClose: () => void;
}

export default function AlertModal({ alert, open, onClose }: AlertModalProps) {
  if (!alert) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{alert.type}</DialogTitle>
      <DialogContent>

        <img
          src={alert.frameUrl}
          alt="frame"
          style={{ width: "100%", borderRadius: 8, marginBottom: 16 }}
        />

        <Typography variant="subtitle2">Timestamp:</Typography>
        <DialogContentText>
          {new Date(alert.timestamp).toLocaleString()}
        </DialogContentText>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>Anomaly Types:</Typography>
        <DialogContentText>
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
        </DialogContentText>

        <Typography variant="subtitle2" sx={{ mt: 2 }}>Details:</Typography>
        <DialogContentText>
          {alert.details}
        </DialogContentText>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
