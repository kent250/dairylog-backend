import axios, { AxiosError, AxiosInstance } from "axios";

import { config } from "../config/env.js";
import { formatRwandanPrefix } from "../utils/phone-number-util.js";

import { ERROR_CODES } from "../utils/error-utils/errorCodes.js";
import { AppError } from "../utils/error-utils/AppError.js";

/**
 * Parameters for sending an SMS message
 */
export interface SendSmsParams {
  content: string;
  to: string;
}

/**
 * Send an SMS message scheduled 10 seconds in the future
 *
 * @param params - SMS parameters with content and recipient phone number
 * @returns Promise resolving to the API response
 *
 * @example
 * ```typescript
 * await sendScheduledSms({
 *   content: "Your verification code is 123456",
 *   to: "+250788888888",
 * });
 * ```
 */
export async function sendScheduledSms(params: SendSmsParams): Promise<void> {
  // Basic validation
  if (!params.content || params.content.trim().length === 0) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, "SMS content cannot be empty");
  }

  const formatedPhone = formatRwandanPrefix(params.to);

  if (!formatedPhone || !/^\+[1-9]\d{1,14}$/.test(formatedPhone)) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "Invalid phone number. Must be in E.164 format (e.g., +250788888888)"
    );
  }

  // Schedule 10 seconds in the future
  const scheduledTime = new Date(Date.now() + 10 * 1000);

  try {
    await axios.post(
      `${config.http_sms.HTTP_SMS_API_URL}/messages/send`,
      {
        content: params.content,
        from: config.http_sms.HTTP_SMS_FROM_NUMBER,
        to: formatedPhone,
        encrypted: false,
        send_at: scheduledTime.toISOString(),
      },
      {
        headers: {
          "x-api-key": config.http_sms.HTTP_SMS_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      throw new AppError(
        ERROR_CODES.EXTERNAL_SERVICE_ERROR,
        `Failed to send SMS: ${message || error.message}`
      );
    }
    throw error;
  }
}
