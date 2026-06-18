import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Propagate reqId (dari pino-http) ke response header `X-Request-Id`.
 *
 * nestjs-pino auto-generate `req.id` (UUID) untuk setiap request dan
 * menyimpannya sebagai properti `id` di object request. Middleware ini
 * membaca nilai tersebut dan menyetelnya sebagai header response, sehingga
 * frontend / client bisa mencatatnya dan digunakan untuk korelasi trace
 * di Loki: query `{service="backend"} |= "<reqId>"`.
 *
 * Dipasang sebelum helmet di main.ts agar header tidak terblokir oleh
 * kebijakan keamanan helmet.
 */
@Injectable()
export class RequestIdHeaderMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const reqId = (req as any).id;
    if (reqId && !res.getHeader('X-Request-Id')) {
      res.setHeader('X-Request-Id', reqId as string);
    }
    next();
  }
}
