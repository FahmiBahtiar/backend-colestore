import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Consistent API response wrapper.
 * All endpoints should return this shape.
 */
export class ApiResponse<T> {
  @ApiProperty({ description: 'Whether the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code' })
  statusCode: number;

  @ApiProperty({ description: 'Human-readable message' })
  message: string;

  @ApiPropertyOptional({ description: 'Response data' })
  data?: T;

  @ApiPropertyOptional({ description: 'ISO 8601 timestamp' })
  timestamp: string;

  constructor(partial: Partial<ApiResponse<T>>) {
    this.success = partial.success ?? true;
    this.statusCode = partial.statusCode ?? 200;
    this.message = partial.message ?? 'Success';
    this.data = partial.data;
    this.timestamp = new Date().toISOString();
  }

  /** Factory: successful response */
  static success<T>(
    data: T,
    message = 'Success',
    statusCode = 200,
  ): ApiResponse<T> {
    return new ApiResponse({ success: true, statusCode, message, data });
  }

  /** Factory: created response */
  static created<T>(data: T, message = 'Created successfully'): ApiResponse<T> {
    return new ApiResponse({ success: true, statusCode: 201, message, data });
  }

  /** Factory: error response */
  static error(message: string, statusCode = 500): ApiResponse<null> {
    return new ApiResponse({ success: false, statusCode, message, data: null });
  }
}
