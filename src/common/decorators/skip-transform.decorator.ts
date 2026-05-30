import { SetMetadata } from '@nestjs/common';

export const SKIP_TRANSFORM_KEY = 'skipTransform';
/**
 * Decorator to bypass global response serialization and return raw values.
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
