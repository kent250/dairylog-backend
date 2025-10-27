import axios, { type AxiosError } from 'axios';

import { config } from '../config/env.js';
import { formatRwandanPrefix } from '../utils/phone-number-util.js';

import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { AppError } from "../utils/error-utils/AppError.js";



interface EasySendSmsPayload {
    from: string;
    to: string;
    text: string;
    type: "0" | "1";
    scheduled?: string;
}

interface EasySendSmsSuccessResponse {
    status: string;
    messageId?: string;
}

interface EasySendSmsErrorResponse {
    status: string;
    message: string;
    code?: number;
}

const EASY_SEND_SMS_API_URL = config.easy_send_sms.EASY_SEND_SMS_API_URL;
const EASY_SEND_SMS_SENDER_ID = config.easy_send_sms.EASY_SEND_SMS_SENDER_ID;
const EASY_SEND_SMS_API_KEY = config.easy_send_sms.EASY_SEND_SMS_API_KEY;

/**
 * Sends an SMS using the EasySendSMS API via axios.
 * @param recipientNumber  recipient phone number.
 * @param message The text message content.
 * @param messageType 0 for plain text, 1 for Unicode.
 * @param scheduledTime Optional ISO 8601 UTC timestamp.
 * @returns Promise resolving to the API response object.
 */
export async function sendEasySms(
    recipientNumber: string,
    message: string,
    messageType: "0" | "1",
    scheduledTime?: string,
): Promise<EasySendSmsSuccessResponse | EasySendSmsErrorResponse> {

    if (!EASY_SEND_SMS_API_KEY) {
        throw new AppError(ERROR_CODES.INVALID_ENV_VARIABLE, 'API Key is missing');
    }

    //get new phone numbers with rwandan prefix
    const formattedNumber = formatRwandanPrefix(recipientNumber)

    const payload: EasySendSmsPayload = {
        from: EASY_SEND_SMS_SENDER_ID,
        to: formattedNumber,
        text: message,
        type: messageType,
    };

    if (scheduledTime) {
        payload.scheduled = scheduledTime;
    }

    // --- Axios Request Config ---
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'apikey': EASY_SEND_SMS_API_KEY
        }
    };
    // --- End Axios Request Config ---

    try {
        // --- Use axios.post ---
        const response = await axios.post<EasySendSmsSuccessResponse>(
            EASY_SEND_SMS_API_URL,
            payload,
            config
        );


        return response.data;

    } catch (error) {


        // --- Axios Specific Error Handling ---
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<EasySendSmsErrorResponse>;
            const status = axiosError.response?.status;
            const errorData = axiosError.response?.data;

            return {
                status: 'error',
                message: `API request failed with status ${status}: ${errorData?.message || axiosError.message}`,
                code: status
            } as EasySendSmsErrorResponse;

        } else {
            // Handle non-Axios errors (e.g., network issues before request)
            let errorMessage = 'An unexpected error occurred while sending SMS.';
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            return {
                status: 'error',
                message: errorMessage,
            } as EasySendSmsErrorResponse;
        }
        // --- End Axios Error Handling ---
    }
}
