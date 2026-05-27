import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Param,
  Patch,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ProcessPaymentWebhookUseCase,
  GetPaymentMethodsUseCase,
  GetPaymentMethodConfigsUseCase,
  TogglePaymentMethodConfigUseCase,
} from '../../application/use-cases';
import { JwtAuthGuard, RolesGuard } from '../guards';
import { UpdatePaymentConfigDto } from '../dtos';
import { Roles } from '../../common/decorators';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly processPaymentWebhookUseCase: ProcessPaymentWebhookUseCase,
    private readonly getPaymentMethodsUseCase: GetPaymentMethodsUseCase,
    private readonly getPaymentMethodConfigsUseCase: GetPaymentMethodConfigsUseCase,
    private readonly togglePaymentMethodConfigUseCase: TogglePaymentMethodConfigUseCase,
  ) {}

  /** Return available payment methods for custom checkout. */
  @Get('methods')
  @ApiOperation({ summary: 'Get available payment methods' })
  @ApiResponse({ status: 200, description: 'Payment methods returned.' })
  async getPaymentMethods() {
    return this.getPaymentMethodsUseCase.execute();
  }

  /** Return all payment configs for admin management. */
  @Get('configs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get all payment configs' })
  @ApiResponse({ status: 200, description: 'Payment configs returned.' })
  async getPaymentConfigs() {
    return this.getPaymentMethodConfigsUseCase.execute();
  }

  /** Update active status or payment expiry limit for a method config. */
  @Patch('configs/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('JWT-auth')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update payment config status and expiry' })
  @ApiResponse({ status: 200, description: 'Payment config updated.' })
  async togglePaymentConfig(
    @Param('id') id: string,
    @Body() body: UpdatePaymentConfigDto,
  ) {
    return this.togglePaymentMethodConfigUseCase.execute(id, body);
  }

  /** Allow Duitku or verification services to ping the webhook URL via GET */
  @Get('duitku/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Duitku webhook URL' })
  @ApiResponse({ status: 200, description: 'Webhook URL verified.' })
  verifyDuitkuWebhook() {
    const logger = new Logger('PaymentsController:DuitkuWebhook');
    logger.log(`Duitku Webhook URL pinged via GET`);
    return 'OK';
  }

  /** Process Duitku webhook callbacks (Direct V2 callback) and return plain text OK response. */
  @Post('duitku/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process Duitku webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed.' })
  async processDuitkuWebhook(@Body() payload: Record<string, unknown>) {
    const logger = new Logger('PaymentsController:DuitkuWebhook');
    if (process.env.NODE_ENV === 'development') {
      logger.debug(
        `Received Duitku Webhook Callback (Full Payload): ${JSON.stringify(payload)}`,
      );
    } else {
      const merchantOrderId =
        typeof payload.merchantOrderId === 'string'
          ? payload.merchantOrderId
          : '';
      const reference =
        typeof payload.reference === 'string' ? payload.reference : '';
      const resultCode =
        typeof payload.resultCode === 'string' ? payload.resultCode : '';
      logger.log(
        `Received Duitku Webhook Callback for order: ${merchantOrderId}, reference: ${reference}, resultCode: ${resultCode}`,
      );
    }
    try {
      const result = await this.processPaymentWebhookUseCase.execute({
        payload,
      });
      logger.log(
        `Webhook successfully processed for order: ${result.orderId}, status: ${result.status}`,
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      logger.error(
        `Error processing Duitku Webhook: ${errorMessage}`,
        errorStack,
      );
      // We still return 'OK' so Duitku doesn't loop infinitely, but we log the error
    }
    return 'OK';
  }
}
