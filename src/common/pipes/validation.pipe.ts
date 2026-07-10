import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export interface ValidationErrorDetail {
  field: string;
  value: unknown;
  constraints: Record<string, string>;
}

/**
 * KoraValidationPipe — replacement for NestJS's built-in ValidationPipe that
 * returns structured, human-readable error bodies instead of a flat message array.
 *
 * Error response shape:
 * {
 *   statusCode: 400,
 *   error: "Bad Request",
 *   message: "Validation failed",
 *   details: [
 *     { field: "amount", value: -50, constraints: { isPositive: "amount must be a positive number" } }
 *   ]
 * }
 */
@Injectable()
export class KoraValidationPipe implements PipeTransform {
  private readonly logger = new Logger(KoraValidationPipe.name);

  async transform(value: unknown, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.shouldValidate(metatype)) return value;

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false,
    });

    if (errors.length > 0) {
      const details = this.flattenErrors(errors);
      this.logger.warn(`Validation failed — ${details.length} error(s)`);
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        details,
      });
    }

    return object;
  }

  private flattenErrors(
    errors: ValidationError[],
    parentField = '',
  ): ValidationErrorDetail[] {
    const result: ValidationErrorDetail[] = [];

    for (const error of errors) {
      const field = parentField ? `${parentField}.${error.property}` : error.property;

      if (error.constraints) {
        result.push({
          field,
          value: error.value,
          constraints: error.constraints,
        });
      }

      if (error.children?.length) {
        result.push(...this.flattenErrors(error.children, field));
      }
    }

    return result;
  }

  private shouldValidate(metatype: Function): boolean {
    const primitives: Function[] = [String, Boolean, Number, Array, Object];
    return !primitives.includes(metatype);
  }
}
