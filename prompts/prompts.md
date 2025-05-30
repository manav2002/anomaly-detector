# LLM Prompts Used

Below are the main prompts used throughout the development of this anomaly detection project. Prompts were directed to ChatGPT to assist with implementation, debugging, and iterative refinement of the system.

## 1. Frontend

**Prompt:**  
"Create a React component with Material-UI that renders a table of alerts with filtering options by message and type."

**Prompt:**  
"How do I preview a video in a React app after a user uploads it?"

**Prompt:**  
"Can you help me implement a modal that opens with detailed alert info when a row is clicked in the table?"

## 2. YOLO + Inference

**Prompt:**  
"How do I load a YOLOv5 TensorFlow.js model in-browser and run inference on video frames?"

**Prompt:**  
"How do I extract frames from an uploaded video in the browser and run TensorFlow.js detection on each one?"

**Prompt:**  
"Why is my TensorFlow.js model not detecting any objects from the Stanford Drone Dataset footage?"

## 3. Backend + AWS

**Prompt:**  
"Help me set up an Express backend that stores alert data in AWS RDS using PostgreSQL."

**Prompt:**  
"How do I deploy a Node.js server to AWS EC2 and keep it running using PM2?"

**Prompt:**  
"How do I store uploaded frame images as static files and return their URLs from Express?"

## 4. Testing + Linting

**Prompt:**  
"Write Jest unit tests for a React table with filtering and modal functionality."

**Prompt:**  
"How do I run ESLint in a TypeScript React project and resolve common plugin warnings?"

---

## Debugging

For debugging, I frequently provided error messages (or screenshots from the code or console) or unexpected behavior to ChatGPT to identify the source of the problem. These prompts included issues like:
- "Why is my YOLO model returning empty predictions?"
- "My frontend isn't connecting to the backend hosted on EC2 what should I check?"
- "This ESLint error is preventing my commit how do I resolve it?"

These interactions helped streamline development and resolve blockers efficiently.
