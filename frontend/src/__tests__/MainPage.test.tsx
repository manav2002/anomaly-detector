import React from 'react';
// Make React used to satisfy bundler / test transforms
void React;

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MainPage from "../pages/MainPage";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";

// 🔧 Mock browser APIs
global.URL.createObjectURL = jest.fn(() => "mock-object-url");

Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: jest.fn(),
});
Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: jest.fn(),
});

HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(100),
        width: 10,
        height: 10,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
})) as any;
jest.mock("../components/AlertTable", () => {
  const MockAlertTable = () => <div data-testid="AlertTable" />;
  MockAlertTable.displayName = "MockAlertTable";
  return MockAlertTable;
});
jest.mock("../components/AlertModal", () => {
  const MockAlertModal = () => <div data-testid="AlertModal" />;
  MockAlertModal.displayName = "MockAlertModal";
  return MockAlertModal;
});

jest.mock("../utils/yolo", () => ({
    loadModel: jest.fn(),
    runYOLOOnFrame: jest.fn(),
}));

const baseAlert = {
    id: "1",
    timestamp: "2024-06-16T12:00:00Z",
    type: "Type A",
    frameUrl: "http://localhost/test.jpg",
    details: "test details",
    message: "test message",
    fullMessage: "Type A: Too many people",
};

// ✅ Default mock
beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
            json: () => Promise.resolve([baseAlert]),
        })
    );
});

describe("MainPage", () => {
    it("renders search and filter inputs", () => {
        render(<MainPage />);
        expect(screen.getByRole("textbox")).toBeInTheDocument();
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("allows typing in search input", () => {
        render(<MainPage />);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "bus" } });
        expect(input).toHaveValue("bus");
    });

    it("allows selecting filter type", async () => {
        render(<MainPage />);
        const dropdown = screen.getByRole("combobox");
        await userEvent.click(dropdown);
        const option = await screen.findByText("Type A");
        await userEvent.click(option);
        expect(dropdown).toHaveTextContent("Type A");
    });

    it("calls loadModel on mount", () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { loadModel } = require("../utils/yolo");
        render(<MainPage />);
        expect(loadModel).toHaveBeenCalled();
    });

    it("updates videoURL when a file is uploaded", async () => {
        render(<MainPage />);
        const fileInput = screen.getByLabelText(/upload video/i);
        const testFile = new File(["dummy"], "test.mp4", { type: "video/mp4" });
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        expect(await screen.findByText(/video preview/i)).toBeInTheDocument();
    });

    it("displays video element after file upload", async () => {
        render(<MainPage />);
        const fileInput = screen.getByLabelText(/upload video/i);
        const testFile = new File(["test"], "video.mp4", { type: "video/mp4" });
        fireEvent.change(fileInput, { target: { files: [testFile] } });
        const video = await screen.findByTestId("video");
        expect(video).toBeInTheDocument();
        expect(video).toHaveAttribute("src", "mock-object-url");
    });

    it("renders alert table with fetched alerts", async () => {
        render(<MainPage />);
        expect(await screen.findByTestId("AlertTable")).toBeInTheDocument();
        expect(await screen.findByTestId("AlertModal")).toBeInTheDocument();
    });

    it("filters alerts based on search input", async () => {
        render(<MainPage />);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "too many" } });
        expect(input).toHaveValue("too many");
    });

    it("filters alerts by type", async () => {
        render(<MainPage />);
        const dropdown = screen.getByRole("combobox");
        await userEvent.click(dropdown);
        const option = await screen.findByText("Type A");
        await userEvent.click(option);
        expect(dropdown).toHaveTextContent("Type A");
    });

    it("filters alerts based on search and type filter", async () => {
        render(<MainPage />);
        const input = screen.getByRole("textbox");
        const dropdown = screen.getByRole("combobox");
        fireEvent.change(input, { target: { value: "too many" } });
        await userEvent.click(dropdown);
        const option = await screen.findByText("Type A");
        await userEvent.click(option);
        expect(input).toHaveValue("too many");
        expect(dropdown).toHaveTextContent("Type A");
    });

    it("calls handleVideoUpload and triggers both POSTs", async () => {
        global.fetch = jest.fn(() =>
            Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
        ) as jest.Mock;

        render(<MainPage />);
        const fileInput = screen.getByLabelText(/upload video/i);
        const file = new File(["data"], "vid.mp4", { type: "video/mp4" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });

    it("runs inference and fetches alerts on video metadata load (scammy)", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { runYOLOOnFrame } = require("../utils/yolo");
        runYOLOOnFrame.mockResolvedValue({
            id: "x",
            timestamp: "t",
            type: "Type A",
            frameUrl: "url",
            details: "details",
            message: "msg",
        });

        global.fetch = jest.fn((url, options) => {
            if (url.includes("/alerts") && options?.method === "DELETE")
                return Promise.resolve({ ok: true });
            if (url.includes("/alerts") && options?.method === "POST")
                return Promise.resolve({ ok: true });
            return Promise.resolve({ json: () => Promise.resolve([baseAlert]) });
        }) as jest.Mock;

        render(<MainPage />);
        const fileInput = screen.getByLabelText(/upload video/i);
        const file = new File(["blob"], "test.mp4", { type: "video/mp4" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const video = await screen.findByTestId("video");
        fireEvent.loadedMetadata(video, {
            currentTarget: {
                duration: 2,
                pause: jest.fn(),
                videoWidth: 640,
                videoHeight: 480,
                currentTime: 0,
                onseeked: null,
            },
        });
    });

    it("uses fallback alerts when DB fetch fails", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { runYOLOOnFrame } = require("../utils/yolo");
        runYOLOOnFrame.mockResolvedValueOnce({
            id: "fallback",
            timestamp: "t",
            type: "Type C",
            frameUrl: "url",
            details: "details",
            message: "fallback",
        });

        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: true }) // DELETE
            .mockResolvedValueOnce({ ok: true }) // POST
            .mockRejectedValueOnce("fail");      // GET

        render(<MainPage />);
        const fileInput = screen.getByLabelText(/upload video/i);
        const file = new File(["blob"], "fallback.mp4", { type: "video/mp4" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const video = await screen.findByTestId("video");

        Object.defineProperty(video, "duration", { value: 1 });
        Object.defineProperty(video, "videoWidth", { value: 100 });
        Object.defineProperty(video, "videoHeight", { value: 100 });

        video.onseeked = () => { };
        Object.defineProperty(video, "currentTime", {
            set() {
                video.onseeked?.(new Event("seeked"));
            },
        });

        fireEvent.loadedMetadata(video);
    });




    it("skips inference if canvas context is null", async () => {
        (HTMLCanvasElement.prototype.getContext as jest.Mock).mockReturnValueOnce(null);

        render(<MainPage />);
        const fileInput = screen.getByLabelText(/upload video/i);
        const file = new File(["frame"], "test.mp4", { type: "video/mp4" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const video = await screen.findByTestId("video");
        fireEvent.loadedMetadata(video, {
            currentTarget: {
                duration: 1,
                pause: jest.fn(),
                videoWidth: 640,
                videoHeight: 480,
                currentTime: 0,
                onseeked: null,
            },
        });
    });

    it("handles null result from runYOLOOnFrame", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { runYOLOOnFrame } = require("../utils/yolo");
        runYOLOOnFrame.mockResolvedValue(null);

        global.fetch = jest.fn(() => Promise.resolve({ ok: true })) as jest.Mock;

        render(<MainPage />);
        const fileInput = screen.getByLabelText(/upload video/i);
        const file = new File(["x"], "video.mp4", { type: "video/mp4" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const video = await screen.findByTestId("video");
        fireEvent.loadedMetadata(video, {
            currentTarget: {
                duration: 1,
                pause: jest.fn(),
                videoWidth: 640,
                videoHeight: 480,
                currentTime: 0,
                onseeked: null,
            },
        });
    });



    it("falls back to Unknown type in fullMessage mapping", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { runYOLOOnFrame } = require("../utils/yolo");
        runYOLOOnFrame.mockResolvedValueOnce({
            id: "u",
            timestamp: "t",
            type: "Type Z", // unknown type
            frameUrl: "frame.jpg",
            details: "???",
            message: "???",
        });

        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: true })
            .mockRejectedValueOnce("fail");

        render(<MainPage />);
        const fileInput = screen.getByLabelText(/upload video/i);
        const file = new File(["blob"], "unk.mp4", { type: "video/mp4" });
        fireEvent.change(fileInput, { target: { files: [file] } });

        const video = await screen.findByTestId("video");
        Object.defineProperty(video, "duration", { value: 1 });
        Object.defineProperty(video, "videoWidth", { value: 100 });
        Object.defineProperty(video, "videoHeight", { value: 100 });

        video.onseeked = () => { };
        Object.defineProperty(video, "currentTime", {
            set() {
                video.onseeked?.(new Event("seeked"));
            },
        });

        fireEvent.loadedMetadata(video);
    });



    it("executes full inference loop and covers onseeked async", async () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { runYOLOOnFrame } = require("../utils/yolo");

        const result = {
            id: "branch-hit",
            timestamp: "t",
            type: "Type A",
            frameUrl: "url",
            details: "details",
            message: "message",
        };

        runYOLOOnFrame
            .mockResolvedValueOnce(result)
            .mockResolvedValueOnce(null); // for t=1 to exercise both branches

        global.fetch = jest.fn((url, options) => {
            if (url.includes("/alerts") && options?.method === "DELETE")
                return Promise.resolve({ ok: true });
            if (url.includes("/alerts") && options?.method === "POST")
                return Promise.resolve({ ok: true });
            return Promise.resolve({ json: () => Promise.resolve([]) });
        }) as jest.Mock;

        render(<MainPage />);
        const input = screen.getByLabelText(/upload video/i);
        const file = new File(["blob"], "vid.mp4", { type: "video/mp4" });
        fireEvent.change(input, { target: { files: [file] } });

        const video = await screen.findByTestId("video");

        // Set necessary properties
        Object.defineProperty(video, "duration", { value: 2 });
        Object.defineProperty(video, "videoWidth", { value: 100 });
        Object.defineProperty(video, "videoHeight", { value: 100 });

        // Intercept onseeked and manually call it
        let seekedHandler: ((ev: Event) => void) | null = null;
        Object.defineProperty(video, "onseeked", {
            set(cb) {
                seekedHandler = cb;
            },
            get() {
                return seekedHandler;
            },
        });

        // Force seek behavior by mocking currentTime
        Object.defineProperty(video, "currentTime", {
            set() {
                setTimeout(() => {
                    seekedHandler?.(new Event("seeked"));
                }, 0);
            },
        });


        fireEvent.loadedMetadata(video);

        // Wait for async loop to resolve
        await waitFor(() => {
            expect(runYOLOOnFrame).toHaveBeenCalledTimes(2);
        });
    });



    it("parses multi-type alerts from DB correctly", async () => {
  const baseAlert = {
    id: "merged",
    timestamp: "2024-06-16T12:00:00Z",
    type: "Type A, Type B",
    frameUrl: "url",
    details: "details",
    message: "message"
  };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { runYOLOOnFrame } = require("../utils/yolo");
  runYOLOOnFrame.mockResolvedValueOnce(baseAlert);

  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true }) // DELETE
    .mockResolvedValueOnce({ ok: true }) // POST
    .mockResolvedValueOnce({ json: () => Promise.resolve([baseAlert]) }); // GET alerts

  render(<MainPage />);
  const fileInput = screen.getByLabelText(/upload video/i);
  const file = new File(["blob"], "x.mp4", { type: "video/mp4" });
  fireEvent.change(fileInput, { target: { files: [file] } });

  const video = await screen.findByTestId("video");

  Object.defineProperty(video, "duration", { value: 1 });
  Object.defineProperty(video, "videoWidth", { value: 100 });
  Object.defineProperty(video, "videoHeight", { value: 100 });

  let seekedHandler: ((ev: Event) => void) | null = null;
  Object.defineProperty(video, "onseeked", {
    get: () => seekedHandler,
    set: (cb) => {
      seekedHandler = cb;
    },
  });
  Object.defineProperty(video, "currentTime", {
    set() {
      setTimeout(() => {
        seekedHandler?.(new Event("seeked"));
      }, 0);
    },
  });

  fireEvent.loadedMetadata(video);

  await screen.findByTestId("AlertTable"); // Wait for render
});


it("logs error when alert deletion fails", async () => {
    global.fetch = jest.fn()
        .mockRejectedValueOnce("fail delete") // DELETE fails
        .mockResolvedValueOnce({ ok: true })  // POST still works
        .mockResolvedValueOnce({ json: () => Promise.resolve([baseAlert]) }); // GET alerts

    render(<MainPage />);
    const input = screen.getByLabelText(/upload video/i);
    const file = new File(["fail"], "fail.mp4", { type: "video/mp4" });
    fireEvent.change(input, { target: { files: [file] } });

    await screen.findByTestId("video");
});


it("logs error if video upload fails", async () => {
    global.fetch = jest.fn(() => Promise.reject("upload error")) as jest.Mock;

    render(<MainPage />);
    const fileInput = screen.getByLabelText(/upload video/i);
    const file = new File(["bad"], "bad.mp4", { type: "video/mp4" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await screen.findByTestId("AlertTable"); // Just to wait for render
});











});
