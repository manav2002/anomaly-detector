import * as tf from '@tensorflow/tfjs';
import { loadModel, runYOLOOnFrame } from '../utils/yolo';

global.ImageData = class {
    width: number;
    height: number;
    data: Uint8ClampedArray;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
    }
} as unknown as typeof ImageData;

jest.mock('@tensorflow/tfjs', () => {
    const baseTensor = {
        div: jest.fn().mockReturnThis(),
        expandDims: jest.fn().mockReturnThis(),
        dispose: jest.fn(),
    };

    return {
        loadGraphModel: jest.fn(() => ({
            executeAsync: jest.fn(),
        })),
        browser: {
            fromPixels: jest.fn(() => baseTensor),
        },
        image: {
            resizeBilinear: jest.fn(() => baseTensor),
        },
        tidy: jest.fn((fn) => fn()),
        dispose: jest.fn(),
    };
});

describe('YOLO Utils', () => {
    const mockExecuteAsync = (detections: number, scores: number[], classes: number[]) => {
        const box = {
            array: jest.fn().mockResolvedValue([
                Array(detections).fill([0, 0, 1, 1])
            ]),
            dispose: jest.fn()
        };

        const scoreTensor = {
            array: jest.fn().mockResolvedValue([scores]),
            dispose: jest.fn()
        };

        const classTensor = {
            array: jest.fn().mockResolvedValue([classes]),
            dispose: jest.fn()
        };

        const validDetections = {
            data: jest.fn().mockResolvedValue([detections]),
            dispose: jest.fn()
        };

        (tf.loadGraphModel as jest.Mock).mockResolvedValueOnce({
            executeAsync: jest.fn().mockResolvedValue([
                box, scoreTensor, classTensor, validDetections
            ])
        });
    };

    beforeEach(() => {
        global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
            putImageData: jest.fn(),
            strokeRect: jest.fn(),
            fillText: jest.fn(),
            drawImage: jest.fn(),
            font: '',
            fillStyle: '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any;

        global.HTMLCanvasElement.prototype.toBlob = function (cb: (blob: Blob) => void) {
            cb(new Blob(['mock']));
        };

        global.fetch = jest.fn(() =>
            Promise.resolve({
                json: () => Promise.resolve({ imageUrl: 'http://localhost/fake.jpg' }),
            })
        ) as jest.Mock;
    });

    it('loads the model successfully', async () => {
        await expect(loadModel()).resolves.toBeUndefined();
        expect(tf.loadGraphModel).toHaveBeenCalled();
    });

    it('detects Type A (too many people)', async () => {
        mockExecuteAsync(7, Array(7).fill(0.9), Array(7).fill(0)); // class 0 = person
        await loadModel();
        const dummyImage = new ImageData(640, 480);
        const result = await runYOLOOnFrame(dummyImage, 1);
        expect(result?.type).toContain('Type A');
    });

    it('detects Type B (vehicle in frame)', async () => {
        mockExecuteAsync(1, [0.9], [2]); // class 2 = car
        await loadModel();
        const dummyImage = new ImageData(640, 480);
        const result = await runYOLOOnFrame(dummyImage, 2);
        expect(result?.type).toContain('Type B');
    });

    it('detects Type C (high-confidence vehicle)', async () => {
        mockExecuteAsync(1, [0.91], [1]); // class 1 = bicycle
        await loadModel();
        const dummyImage = new ImageData(640, 480);
        const result = await runYOLOOnFrame(dummyImage, 3);
        expect(result?.type).toContain('Type C');
    });

    it('handles no triggered rules (returns null)', async () => {
        mockExecuteAsync(1, [0.1], [50]); // class 50 = broccoli
        await loadModel();
        const dummyImage = new ImageData(640, 480);
        const result = await runYOLOOnFrame(dummyImage, 4);
        expect(result).toBeNull();
    });
});
