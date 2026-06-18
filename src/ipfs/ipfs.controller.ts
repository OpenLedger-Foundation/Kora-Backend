import {
  Controller, Post, UploadedFile, UseInterceptors, UseGuards, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IpfsService } from './ipfs.service';

@ApiTags('ipfs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ipfs')
export class IpfsController {
  constructor(private readonly ipfsService: IpfsService) {}

  @ApiOperation({ summary: 'Upload invoice PDF to IPFS via Pinata' })
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const cid = await this.ipfsService.uploadFile(file.buffer, file.originalname, file.mimetype);
    return { cid, url: this.ipfsService.getUrl(cid) };
  }

  @ApiOperation({ summary: 'Upload JSON metadata to IPFS' })
  @Post('metadata')
  async metadata(@Body() body: Record<string, any>) {
    const cid = await this.ipfsService.uploadJson(body, `metadata-${Date.now()}`);
    return { cid, url: this.ipfsService.getUrl(cid) };
  }
}
