import { FaqEntity } from '../../domain/repositories';
import { FaqResponseDto } from '../dtos';

export class FaqMapper {
  /** Map persisted FAQ data to an application response DTO. */
  static toResponse(faq: FaqEntity): FaqResponseDto {
    return { ...faq };
  }
}
