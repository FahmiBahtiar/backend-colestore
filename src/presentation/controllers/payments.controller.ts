import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ProcessXenditWebhookUseCase } from '../../application/use-cases';
import { XenditService } from '../../infrastructure/services';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly processXenditWebhookUseCase: ProcessXenditWebhookUseCase,
    private readonly xenditService: XenditService,
  ) {}

  /** Process Xendit invoice callbacks after verifying the callback token. */
  @Post('xendit/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process Xendit webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed.' })
  async processXenditWebhook(
    @Body() payload: unknown,
    @Headers('x-callback-token') callbackToken?: string,
  ) {
    this.xenditService.verifyWebhookToken(callbackToken);
    return this.processXenditWebhookUseCase.execute({ payload });
  }
}
