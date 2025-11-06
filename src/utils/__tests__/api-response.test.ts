import { sendSuccess, ApiResponse } from "../api-response.js";
import type { Response } from "express";

const mockResponse = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

describe("sendSuccess", () => {
    it("returns a standard success response", () => {
        const res = mockResponse();
        sendSuccess(res, { id: 1 }, { message: "OK" });

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: { id: 1 },
                message: "OK",
                meta: expect.objectContaining({
                    timestamp: expect.any(String),
                }),
            })
        );
    });

    it("respects custom status code", () => {
        const res = mockResponse();
        sendSuccess(res, { foo: "bar" }, { statusCode: 201 });
        expect(res.status).toHaveBeenCalledWith(201);
    });
});

describe("ApiResponse.paginated", () => {
    it("adds pagination metadata correctly", () => {
        const res = mockResponse();
        ApiResponse.paginated(
            res,
            [{ id: 1 }],
            { currentPage: 1, limit: 10, total: 25 }
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                meta: expect.objectContaining({
                    pagination: expect.objectContaining({
                        totalPages: 3,
                        hasNext: true,
                        hasPrev: false,
                    }),
                }),
            })
        );
    });
});
