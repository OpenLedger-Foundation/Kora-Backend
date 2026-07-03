import { NotFoundException } from '@nestjs/common';

export class InvoiceNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Invoice with id "${id}" was not found`);
  }
}
