
import React from 'react';
// Make React used to satisfy bundler / test transforms
void React;

import { useState, useEffect } from "react";
import {
    Container,
    Typography,
    Box,
    TextField,
    MenuItem,
    Paper,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import AlertTable from "../components/AlertTable";
import AlertModal from "../components/AlertModal";
import type { Alert } from "../types/alert";
import { loadModel, runYOLOOnFrame } from "../utils/yolo";

type AugmentedAlert = Alert & { fullMessage: string };

const alertTypes = ["All", "Type A", "Type B", "Type C"];

const baseURL = import.meta.env.VITE_API_URL;

export default function MainPage() {
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
    const [videoURL, setVideoURL] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [alerts, setAlerts] = useState<AugmentedAlert[]>([]);


    useEffect(() => {
        loadModel();
    }, []);

    const handleVideoUpload = async (file: File) => {
        const formData = new FormData();
        formData.append("video", file);
        try {
            // await fetch("http://localhost:4000/upload", {
            await fetch(`${baseURL}/upload`, {
                method: "POST",
                body: formData,
            });
        } catch (error) {
            console.error("Upload failed:", error);
        }
    };

    const runInferenceOnVideo = async (videoElement: HTMLVideoElement) => {

        try {
            // await fetch("http://localhost:4000/alerts", { method: "DELETE" });
            await fetch("`${baseURL}/alerts", { method: "DELETE" });
            console.log("🧹 Cleared old alerts from database");
        } catch (error) {
            console.error("❌ Failed to clear old alerts:", error);
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const frameInterval = 1; // seconds
        const totalDuration = videoElement.duration;
        const newAlerts: Alert[] = [];

        for (let t = 0; t < totalDuration; t += frameInterval) {
            await new Promise<void>((resolve) => {
                videoElement.currentTime = t;
                videoElement.onseeked = async () => {
                    canvas.width = videoElement.videoWidth;
                    canvas.height = videoElement.videoHeight;
                    ctx.drawImage(videoElement, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    // const result = await runYOLOOnFrame(imageData, t);
                    // if (result) newAlerts.push(result);
                    const result = await runYOLOOnFrame(imageData, t);
                    if (result) {
                        newAlerts.push(result);

                        // ⬇️ Send to backend
                        try {
                            // await fetch("http://localhost:4000/alerts", {
                            await fetch("`${baseURL}/alerts", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify(result),
                            });
                        } catch (error) {
                            console.error("❌ Failed to save alert:", error);
                        }
                    }


                    resolve();
                };
            });
        }


        try {
            // const res = await fetch("http://localhost:4000/alerts");
            const res = await fetch("`${baseURL}/alerts");

            const dbAlerts = await res.json();

            const withFullMessage = dbAlerts.map((a: Alert) => {
                const descMap: Record<string, string> = {
                    'Type A': 'Too many people',
                    'Type B': 'Car or bus detected',
                    'Type C': 'High-confidence object (car/bus/bike)',
                };
                return {
                    ...a,
                    fullMessage: a.type
                        .split(',')
                        .map((t) => `${t.trim()}: ${descMap[t.trim()] || 'Unknown type'}`)
                        .join(', '),
                };
            });

            setAlerts(withFullMessage);
        } catch (error) {
            console.error("❌ Failed to fetch alerts from DB:", error);
            // setAlerts(newAlerts); // fallback to local
            setAlerts(
                newAlerts.map((a) => ({
                    ...a,
                    fullMessage: a.type
                        .split(",")
                        .map((t) => {
                            const descMap: Record<string, string> = {
                                "Type A": "Too many people",
                                "Type B": "Car or bus detected",
                                "Type C": "High-confidence object (car/bus/bike)",
                            };
                            return `${t.trim()}: ${descMap[t.trim()] || "Unknown type"}`;
                        })
                        .join(", "),
                }))
            );
        }

    };


    const filteredAlerts = alerts.filter((alert) => {
        const matchesType = filterType === "All" || alert.type === filterType;
        const matchesSearch = alert.fullMessage.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesType && matchesSearch;
    });

    return (
        <Container maxWidth="lg">
            <Box my={4}>
                <Typography variant="h4" gutterBottom>
                    Anomaly Alerts
                </Typography>

                {/* 🔍 Search Criteria Section */}
                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Search Criteria
                    </Typography>
                    <Grid container columns={12} columnSpacing={2}>
                        <Grid gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                label="Search Message"
                                variant="outlined"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </Grid>
                        <Grid gridColumn={{ xs: "span 12", md: "span 6" }}>
                            <TextField
                                fullWidth
                                select
                                label="Filter by Type"
                                variant="outlined"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                {alertTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    </Grid>

                </Paper>

                {/* 📋 Alerts Table Section */}
                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Search Results
                    </Typography>
                    <AlertTable alerts={filteredAlerts} onRowClick={setSelectedAlert} />
                    <AlertModal
                        alert={selectedAlert}
                        open={!!selectedAlert}
                        onClose={() => setSelectedAlert(null)}
                    />
                </Paper>

                {/* 📤 Upload Section */}
                <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Upload Video
                    </Typography>
                    <input
                        type="file"
                        accept="video/*"
                        aria-label="Upload Video"
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            if (file) {
                                const url = URL.createObjectURL(file);
                                setVideoURL(url);
                                handleVideoUpload(file);
                            }
                        }}
                    />
                </Paper>

                {/* 🎞️ Video Section */}
                {videoURL && (
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Video Preview
                        </Typography>
                        <video
                            data-testid="video" // ← add this
                            src={videoURL}
                            controls
                            width="100%"
                            onLoadedMetadata={(e) => {
                                const videoEl = e.currentTarget;
                                videoEl.pause();
                                runInferenceOnVideo(videoEl);
                            }}
                        />
                    </Paper>
                )}
            </Box>
        </Container>
    );

}
